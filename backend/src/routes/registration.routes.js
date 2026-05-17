const express = require('express');
const RegistrationController = require('../controllers/registration.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { workshopRegistrationLimiter } = require('../middlewares/rateLimitMiddleware');
const checkIdempotency = require('../middlewares/checkIdempotency.middleware');

const router = express.Router();

// [PHASE 5] Synchronous registration with immediate seat reservation and idempotency check
router.post('/', authMiddleware, workshopRegistrationLimiter, checkIdempotency, RegistrationController.registerSynchronous);

// [PHASE 6] Get my registrations
router.get('/my', authMiddleware, RegistrationController.getMyRegistrations);

// [PHASE 5] Webhook for payment gateway
router.post('/webhook', RegistrationController.handlePaymentWebhook);

// [PHASE 6] Polling registration status
router.get('/:id', authMiddleware, RegistrationController.getRegistrationStatus);

// [PHASE 6] Cancel registration
router.post('/:id/cancel', authMiddleware, RegistrationController.cancelRegistration);

module.exports = router;
