const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTesting = process.env.NODE_ENV === 'test';

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // In test environments, don't keep retrying — prevents open handle warnings
  lazyConnect: isTesting,
  retryStrategy: isTesting ? () => null : undefined,
});

redisClient.on('connect', () => {
  console.log('Connected to Redis successfully');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

module.exports = redisClient;
