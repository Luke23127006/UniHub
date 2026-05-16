const prisma = require('../../config/db');
const { publishMessage } = require('../../utils/rabbitmq');

const NOTIFICATION_QUEUE = 'notification_queue';

/**
 * Creates a NotificationEvent row and enqueues it for async delivery.
 *
 * DB write happens first (outbox-style safety): if the broker publish throws,
 * the row stays at status='queued' so a recovery job can republish without
 * losing the event.
 *
 * @param {bigint|string|number}           userId
 * @param {string}                         eventType         e.g. 'ticket.created.event'
 * @param {string|null}                    relatedEntityType e.g. 'registration'
 * @param {bigint|string|number|null}      relatedEntityId
 * @param {Record<string, unknown>|null}   payload           template variables
 * @returns {Promise<bigint>}              id of the created NotificationEvent
 */
async function queueNotification(
  userId,
  eventType,
  relatedEntityType = null,
  relatedEntityId   = null,
  payload           = null,
) {
  // ── 1. Persist ─────────────────────────────────────────────────────────────
  const event = await prisma.notificationEvent.create({
    data: {
      event_type:          eventType,
      recipient_user_id:   BigInt(userId),
      related_entity_type: relatedEntityType ?? null,
      related_entity_id:   relatedEntityId != null ? BigInt(relatedEntityId) : null,
      // Schema stores payload as TEXT; worker will JSON.parse it back.
      payload:             payload != null ? JSON.stringify(payload) : null,
      status:              'queued',
    },
    select: { id: true },
  });

  // ── 2. Publish ──────────────────────────────────────────────────────────────
  // BigInt is not JSON-serialisable — convert to string before passing to the
  // broker. publishMessage() handles the final Buffer serialisation internally,
  // so we hand it a plain object, not a pre-stringified string.
  await publishMessage(NOTIFICATION_QUEUE, { eventId: event.id.toString() });

  return event.id;
}

module.exports = { queueNotification };
