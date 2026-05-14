const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// ioredis enters a dedicated "subscriber" mode the moment .subscribe() is called,
// making that connection unable to issue regular commands (GET, SET, PUBLISH, etc.).
// Two separate clients are required: one locked in subscriber mode to receive
// seat_updates events, and one free to publish them.
const redisPublisher = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const redisSubscriber = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisPublisher.on('connect', () => {
  console.log('[Redis Pub] Connected successfully');
});

redisPublisher.on('error', (err) => {
  console.error('[Redis Pub] Connection error:', err);
});

redisSubscriber.on('connect', () => {
  console.log('[Redis Sub] Connected successfully');
});

redisSubscriber.on('error', (err) => {
  console.error('[Redis Sub] Connection error:', err);
});

module.exports = { redisPublisher, redisSubscriber };
