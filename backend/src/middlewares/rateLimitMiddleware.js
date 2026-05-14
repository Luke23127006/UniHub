const { registrationLimiter } = require('./rateLimiter.middleware');

module.exports = { workshopRegistrationLimiter: registrationLimiter };