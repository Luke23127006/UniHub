const { getChannel } = require('../config/rabbitmq');

/**
 * Publishes a JSON-serializable message to a durable queue.
 *
 * @param {string} queueName
 * @param {object} message
 */
async function publishMessage(queueName, message) {
  const channel = getChannel();
  await channel.assertQueue(queueName, { durable: true });
  const sent = channel.sendToQueue(
    queueName,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
  if (!sent) {
    throw new Error(`[RabbitMQ] Back-pressure: failed to enqueue message to "${queueName}"`);
  }
}

/**
 * Registers a consumer on a durable queue.
 * Messages are ack'd only after the callback resolves successfully.
 * Failures are nack'd without requeue to prevent poison-pill loops.
 *
 * @param {string} queueName
 * @param {(payload: object) => Promise<void>} callback
 */
async function consumeMessages(queueName, callback) {
  const channel = getChannel();
  await channel.assertQueue(queueName, { durable: true });
  channel.prefetch(1);

  channel.consume(queueName, async (msg) => {
    if (!msg) return;

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      console.error(`[RabbitMQ] Malformed message on "${queueName}" — discarding`);
      channel.nack(msg, false, false);
      return;
    }

    try {
      await callback(payload);
      channel.ack(msg);
    } catch (err) {
      console.error(`[RabbitMQ] Handler error on "${queueName}":`, err.message);
      channel.nack(msg, false, false);
    }
  }, { noAck: false });

  console.log(`[RabbitMQ] Consumer registered on "${queueName}"`);
}

module.exports = { publishMessage, consumeMessages };
