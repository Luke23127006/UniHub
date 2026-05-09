const rateLimit = require('express-rate-limit');

const workshopRegistrationLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 2, // Only allow 1 user to click at most 2 times per 10 seconds

  keyGenerator: (req) => {
    return req.headers['x-user-id'] || req.ip; 
  },
  
  message: {
    message: 'The system is busy processing, please do not spam. Please try again in a few seconds.'
  },
  
  standardHeaders: true, 
  legacyHeaders: false, 
});

module.exports = { workshopRegistrationLimiter };