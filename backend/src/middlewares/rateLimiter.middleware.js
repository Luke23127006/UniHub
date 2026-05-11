const { RateLimiterRedis } = require('rate-limiter-flexible');
const redisClient = require('../config/redis');

const TOO_MANY_REQUESTS = {
  error: 'TOO_MANY_REQUESTS',
  message: 'The system is busy processing, please do not spam. Please try again in a few seconds.',
};

const globalRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:global',
  points: 100,
  duration: 60,
});

const registrationRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:registration',
  points: 2,
  duration: 10,
});

function makeMiddleware(limiter, keyFn) {
  return async (req, res, next) => {
    const key = keyFn(req);
    try {
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      res.set('Retry-After', retryAfter);
      res.status(429).json(TOO_MANY_REQUESTS);
    }
  };
}

const globalLimiter = makeMiddleware(
  globalRateLimiter,
  (req) => req.headers['x-forwarded-for'] || req.ip,
);

const registrationLimiter = makeMiddleware(
  registrationRateLimiter,
  (req) => req.headers['x-user-id'] || req.headers['x-forwarded-for'] || req.ip,
);

module.exports = { globalLimiter, registrationLimiter };
