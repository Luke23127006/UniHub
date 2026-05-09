const { getChannel } = require('../config/rabbitmq');
const RedisLock = require('../utils/redisLock');
const WorkshopService = require('../services/workshopService');

async function processRegistrationMessage(msg, channel) {
  if (!msg) return;

  let payload;
  try {
    payload = JSON.parse(msg.content.toString());
  } catch (error) {
    console.error('Failed to parse message content:', error);
    // Reject message and do not requeue because it's malformed
    channel.nack(msg, false, false);
    return;
  }

  const { workshopId, userId } = payload;
  const lockKey = `lock:workshop:${workshopId}`;

  // Attempt to acquire Redis Lock for 5 seconds
  const lockAcquired = await RedisLock.acquireLock(lockKey, 5000);

  if (!lockAcquired) {
    console.log(`Could not acquire lock for workshop ${workshopId}. Requeueing message.`);
    // Requeue the message to try again later
    channel.nack(msg, false, true);
    return;
  }

  try {
    // Call the Service layer to handle business logic
    const result = await WorkshopService.processRegistration(userId, workshopId);
    console.log(result.message);

    // Acknowledge the message if transaction succeeded
    channel.ack(msg);
  } catch (error) {
    console.error('Error processing registration:', error.message);
    // NACK and do not requeue for business errors (e.g., student not found, already registered)
    // In a real system, we might push to a Dead Letter Queue (DLQ)
    channel.nack(msg, false, false);
  } finally {
    // Always release the lock
    await RedisLock.releaseLock(lockKey);
  }
}

async function startRegistrationWorker() {
  try {
    const channel = getChannel();
    const queueName = 'workshop_registration_queue';

    // Ensure queue exists
    await channel.assertQueue(queueName, { durable: true });
    
    // Set prefetch count to handle 1 message at a time per worker instance
    channel.prefetch(1);

    console.log(`[*] Waiting for messages in ${queueName}. To exit press CTRL+C`);

    channel.consume(queueName, async (msg) => {
      await processRegistrationMessage(msg, channel);
    }, { noAck: false }); // Requires explicit acknowledgment
  } catch (error) {
    console.error('Failed to start registration worker:', error);
  }
}

module.exports = { startRegistrationWorker };
