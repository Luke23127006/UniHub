const amqp = require('amqplib');

let connection = null;
let channel = null;

async function connectRabbitMQ() {
  try {
    const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(amqpUrl);
    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ successfully');
    
    // Assert the queue exists
    await channel.assertQueue('workshop_registration_queue', { durable: true });
    
    return { connection, channel };
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    process.exit(1);
  }
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
