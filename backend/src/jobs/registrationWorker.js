const { getChannel } = require('../config/rabbitmq');
const RedisLock = require('../utils/redisLock');
const WorkshopService = require('../services/workshopService');

const LOCK_TTL_MS = 30_000;
const LOCK_RETRY_DELAY_MS = 500;

const REGISTRATION_QUEUE = 'workshop_registration_queue';
const REGISTRATION_DLQ = 'workshop_registration_dlq';

async function sendToDlq(channel, originalPayload, errorMessage) {
  try {
    await channel.assertQueue(REGISTRATION_DLQ, { durable: true });
    const dlqPayload = {
      ...originalPayload,
      _error: errorMessage,
      _failedAt: new Date().toISOString(),
    };
    channel.sendToQueue(
      REGISTRATION_DLQ,
      Buffer.from(JSON.stringify(dlqPayload)),
      { persistent: true }
    );
    console.error(`[DLQ] Routed failed registration to ${REGISTRATION_DLQ}:`, dlqPayload);
  } catch (dlqErr) {
    console.error('[DLQ] Failed to publish to dead-letter queue:', dlqErr.message, 'Original payload:', originalPayload);
  }
}

async function processRegistrationMessage(msg, channel) {
  if (!msg) return;

  let payload;
  try {
    payload = JSON.parse(msg.content.toString());
  } catch (error) {
    console.error('Failed to parse message content:', error);
    channel.nack(msg, false, false); // Malformed — do not requeue
    return;
  }

  const { workshopId, userId } = payload;
  const lockKey = `lock:workshop:${workshopId}`;

  const lockToken = await RedisLock.acquireLock(lockKey, LOCK_TTL_MS);

  if (!lockToken) {
    console.log(`Could not acquire lock for workshop ${workshopId}. Requeueing after ${LOCK_RETRY_DELAY_MS}ms.`);
    await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_DELAY_MS));
    channel.nack(msg, false, true);
    return;
  }

  try {
    const result = await WorkshopService.processRegistration(userId, workshopId);
    console.log(result.message);
    channel.ack(msg);
  } catch (error) {
    console.error('Error processing registration:', error.message);
    // Send to DLQ so the failure is persisted and observable before discarding.
    await sendToDlq(channel, payload, error.message);
    channel.nack(msg, false, false);
  } finally {
    await RedisLock.releaseLock(lockKey, lockToken);
  }
}

async function startRegistrationWorker() {
  try {
    const channel = getChannel();

    await channel.assertQueue(REGISTRATION_QUEUE, { durable: true });
    channel.prefetch(1);

    console.log(`[*] Waiting for messages in ${REGISTRATION_QUEUE}. To exit press CTRL+C`);

    channel.consume(REGISTRATION_QUEUE, async (msg) => {
      await processRegistrationMessage(msg, channel);
    }, { noAck: false });
  } catch (error) {
    console.error('Failed to start registration worker:', error);
  }
}

module.exports = { startRegistrationWorker };
