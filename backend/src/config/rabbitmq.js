const amqp = require('amqplib');

let connection = null;
let channel = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectRabbitMQ() {
  const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  const maxRetries = parseInt(process.env.RABBITMQ_CONNECT_RETRIES || '10', 10);
  const retryDelayMs = parseInt(process.env.RABBITMQ_CONNECT_RETRY_DELAY_MS || '5000', 10);

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      connection = await amqp.connect(amqpUrl);
      channel = await connection.createChannel();
      console.log('Connected to RabbitMQ successfully');
      
      // Assert the queue exists
      await channel.assertQueue('workshop_registration_queue', { durable: true });
      
      return { connection, channel };
    } catch (error) {
      lastError = error;
      console.error(`RabbitMQ connection attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        await sleep(retryDelayMs);
      }
    }
  }

  throw new Error(`RabbitMQ connection failed after ${maxRetries} attempts: ${lastError.message}`);
}

function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

async function closeRabbitMQ() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
}

module.exports = {
  connectRabbitMQ,
  getChannel,
  closeRabbitMQ
};
