const { getChannel } = require('../config/rabbitmq');
const RedisLock = require('../utils/redisLock');
const WorkshopService = require('../services/workshopService');

// Must comfortably exceed the worst-case processRegistration duration
// (DB transaction + index contention under full load). Tune upward if profiling
// shows P99 transaction times approaching this value.
const LOCK_TTL_MS = 30_000;

// How long to wait before requeuing a message when the lock is already held.
// Without this pause, a worker that loses the race immediately NACKs and
// RabbitMQ redelivers, creating a tight busy-loop under contention.
const LOCK_RETRY_DELAY_MS = 500;

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
    // NACK without requeue for deterministic business errors (duplicate, not found).
    // Consider routing to a Dead Letter Queue for observability in production.
    channel.nack(msg, false, false);
  } finally {
    // Token-gated release: safe even if the TTL expired mid-processing.
    await RedisLock.releaseLock(lockKey, lockToken);
  }
}

async function startRegistrationWorker() {
  try {
    const channel = getChannel();
    const queueName = 'workshop_registration_queue';

    await channel.assertQueue(queueName, { durable: true });
    channel.prefetch(1); // One in-flight message per worker instance

    console.log(`[*] Waiting for messages in ${queueName}. To exit press CTRL+C`);

    channel.consume(queueName, async (msg) => {
      await processRegistrationMessage(msg, channel);
    }, { noAck: false });
  } catch (error) {
    console.error('Failed to start registration worker:', error);
  }
}

module.exports = { startRegistrationWorker };
