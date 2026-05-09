const rateLimit = require('express-rate-limit');

const workshopRegistrationLimiter = rateLimit({
  windowMs: 10 * 1000, // Time window: 10 seconds
  max: 3, // Limit: Maximum 3 requests / 10 seconds per IP
  message: {
    message: 'The system is busy processing, please do not spam. Please try again in a few seconds.'
  },
  standardHeaders: true, // Return RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

module.exports = { workshopRegistrationLimiter };
