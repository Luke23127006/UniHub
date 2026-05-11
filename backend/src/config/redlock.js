const Redlock = require('redlock').default;
const redisClient = require('./redis');

// retryCount: 0 — fail immediately if the lock is held; callers handle contention as a 409.
const redlock = new Redlock([redisClient], { retryCount: 0 });

redlock.on('error', (err) => {
  console.error('[Redlock] Client error:', err);
});

module.exports = redlock;
