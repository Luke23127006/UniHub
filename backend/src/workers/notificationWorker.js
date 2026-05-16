const prisma = require('../config/db');
const { consumeMessages } = require('../utils/rabbitmq');
const { compileTemplate } = require('../utils/templateEngine');
const EmailStrategy = require('../services/notification/strategies/EmailStrategy');
const PushStrategy = require('../services/notification/strategies/PushStrategy');
const NotificationContext = require('../services/notification/NotificationContext');

const NOTIFICATION_QUEUE = 'notification_queue';

// ─── Strategy Factory ────────────────────────────────────────────────────────

/**
 * Maps a NotificationChannel enum value to the correct Strategy instance.
 * `app` and `telegram` are both handled by PushStrategy (mock FCM / bot dispatch).
 *
 * @param {'email'|'app'|'telegram'} channel
 * @returns {import('../services/notification/strategies/NotificationStrategy')}
 */
function buildStrategy(channel) {
  switch (channel) {
    case 'email':    return new EmailStrategy();
    case 'app':
    case 'telegram': return new PushStrategy();
    default:         throw new Error(`Unknown notification channel: "${channel}"`);
  }
}

/**
 * Resolves the delivery address for the chosen channel.
 * Email: user.email
 * App / Telegram: prefer a token from the event payload; fall back to user ID string
 * so the mock push strategy always receives a non-empty recipient.
 *
 * @param {'email'|'app'|'telegram'} channel
 * @param {{ id: bigint, email: string }} user
 * @param {object} payloadData  — parsed JSON from NotificationEvent.payload
 * @returns {string}
 */
function resolveRecipientAddress(channel, user, payloadData) {
  switch (channel) {
    case 'email':
      return user.email;
    case 'app':
      return payloadData.deviceToken ?? `user:${user.id}`;
    case 'telegram':
      return payloadData.telegramChatId ?? `user:${user.id}`;
    default:
      throw new Error(`Cannot resolve address for unknown channel: "${channel}"`);
  }
}

/**
 * Builds the strategy-specific payload from a compiled subject + body.
 *
 * @param {'email'|'app'|'telegram'} channel
 * @param {string|null}  subject
 * @param {string}       body
 * @param {{ full_name?: string }} user
 * @returns {object}
 */
function buildNotifPayload(channel, subject, body, user) {
  if (channel === 'email') {
    return {
      subject: subject ?? '(no subject)',
      message: body,
      recipientName: user.full_name ?? 'Student',
    };
  }
  // PushStrategy expects { title, body }
  return { title: subject ?? 'UniHub Notification', body };
}

// ─── DB Helpers ──────────────────────────────────────────────────────────────

async function markProcessing(eventId) {
  return prisma.notificationEvent.update({
    where:  { id: eventId },
    data:   { status: 'processing' },
  });
}

async function markSent(eventId, channel, recipientAddress) {
  const now = new Date();
  return prisma.$transaction([
    prisma.notificationEvent.update({
      where: { id: eventId },
      data:  { status: 'sent', processed_at: now },
    }),
    prisma.notificationLog.create({
      data: {
        event_id:          eventId,
        channel,
        recipient_address: recipientAddress,
        status:            'sent',
        sent_at:           now,
      },
    }),
  ]);
}

async function markFailed(eventId, channel, recipientAddress, errorMessage) {
  return prisma.$transaction([
    prisma.notificationEvent.update({
      where: { id: eventId },
      data: {
        status:        'failed',
        processed_at:  new Date(),
        retry_count:   { increment: 1 },
        next_retry_at: new Date(Date.now() + 5 * 60 * 1_000), // retry in 5 min
      },
    }),
    prisma.notificationLog.create({
      data: {
        event_id:          eventId,
        channel,
        recipient_address: recipientAddress,
        status:            'failed',
        error_message:     errorMessage.slice(0, 1000), // guard against oversized strings
      },
    }),
  ]);
}

// ─── Core Processing ─────────────────────────────────────────────────────────

/**
 * Full processing pipeline for a single notification event.
 * Throws on unrecoverable errors so the caller can handle failure bookkeeping.
 *
 * @param {bigint} eventId
 * @returns {Promise<{ channel: string, recipientAddress: string }>}
 *   Resolves with channel + address so the caller can write the success log.
 */
async function processNotification(eventId) {
  // ── 1. Load event + recipient ────────────────────────────────────────────
  const event = await prisma.notificationEvent.findUnique({
    where:   { id: eventId },
    include: { recipient: { select: { id: true, email: true, full_name: true } } },
  });

  if (!event) {
    throw new Error(`NotificationEvent ${eventId} not found`);
  }

  // Guard against double-processing (e.g., consumer restart with unacked messages)
  if (event.status === 'sent') {
    console.warn(`[NotificationWorker] Event ${eventId} already sent — skipping`);
    return null;
  }

  // ── 2. Mark as processing ────────────────────────────────────────────────
  await markProcessing(eventId);

  // ── 3. Fetch active template ─────────────────────────────────────────────
  const template = await prisma.notificationTemplate.findFirst({
    where: { event_type: event.event_type, is_active: true },
  });

  if (!template) {
    throw new Error(`No active NotificationTemplate for event_type "${event.event_type}"`);
  }

  // ── 4. Parse payload & compile templates ─────────────────────────────────
  let payloadData = {};
  if (event.payload) {
    try {
      payloadData = JSON.parse(event.payload);
    } catch {
      throw new Error(`Malformed JSON in NotificationEvent.payload for event ${eventId}`);
    }
  }

  const subject = template.subject_template
    ? compileTemplate(template.subject_template, payloadData)
    : null;
  const body = compileTemplate(template.body_template, payloadData);

  // ── 5. Resolve channel address & build strategy ──────────────────────────
  const recipientAddress = resolveRecipientAddress(template.channel, event.recipient, payloadData);
  const strategy = buildStrategy(template.channel);
  const ctx = new NotificationContext(strategy);
  const notifPayload = buildNotifPayload(template.channel, subject, body, event.recipient);

  // ── 6. Dispatch ──────────────────────────────────────────────────────────
  await ctx.notify(recipientAddress, notifPayload);
  console.log(`[NotificationWorker] Sent event ${eventId} via ${template.channel} → ${recipientAddress}`);

  return { channel: template.channel, recipientAddress };
}

// ─── Worker Entry Point ───────────────────────────────────────────────────────

async function startNotificationWorker() {
  await consumeMessages(NOTIFICATION_QUEUE, async (msg) => {
    const rawId = msg?.eventId;
    if (!rawId) {
      console.error('[NotificationWorker] Received message without eventId — discarding:', msg);
      return; // consumeMessages will ack; malformed messages are not retryable
    }

    const eventId = BigInt(rawId);

    try {
      const result = await processNotification(eventId);

      if (result) {
        await markSent(eventId, result.channel, result.recipientAddress);
      }
      // null result means already-sent idempotency guard — still ack cleanly
    } catch (err) {
      console.error(`[NotificationWorker] Event ${rawId} failed:`, err.message);

      // Best-effort failure recording. We intentionally swallow errors here so
      // the message is ack'd and not requeued — retry is driven by next_retry_at.
      await markFailed(
        eventId,
        // If template fetch failed we have no channel; default to 'email' so
        // the NotificationLog row satisfies the NOT NULL constraint.
        err._channel ?? 'email',
        err._recipientAddress ?? 'unknown',
        err.message,
      ).catch((dbErr) => {
        console.error(`[NotificationWorker] Could not write failure log for event ${rawId}:`, dbErr.message);
      });
    }
  });

  console.log(`[NotificationWorker] Consuming from "${NOTIFICATION_QUEUE}"`);
}

module.exports = { startNotificationWorker };
