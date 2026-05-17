// RUN: docker compose --profile test up --force-recreate k6

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
    // Bypass global rate limiting in non-production environments to avoid blocking the developer or test tools
    if (process.env.NODE_ENV !== 'production' && limiter.keyPrefix === 'rl:global') {
      return next();
    }

    const key = keyFn(req);
    try {
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      if (rejRes && typeof rejRes.msBeforeNext === 'number') {
        const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
        res.set('Retry-After', retryAfter);
        return res.status(429).json(TOO_MANY_REQUESTS);
      }
      next(rejRes);
    }
  };
}

const globalLimiter = makeMiddleware(
  globalRateLimiter,
  (req) => req.ip,
);

const registrationLimiter = makeMiddleware(
  registrationRateLimiter,
  (req) => {
    if (req.user) {
      const userId = req.user.id || req.user.sub;
      if (userId != null) return String(userId);
    }
    return req.ip;
  },
);

module.exports = { globalLimiter, registrationLimiter };
