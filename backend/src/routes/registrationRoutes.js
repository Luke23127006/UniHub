const express = require('express');
const RegistrationController = require('../controllers/registrationController');
const authMiddleware = require('../middlewares/authMiddleware');
const { workshopRegistrationLimiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

// [PHASE 5] Synchronous registration with immediate seat reservation
router.post('/', workshopRegistrationLimiter, authMiddleware, RegistrationController.registerSynchronous);

// [PHASE 6] Get my registrations
router.get('/my', authMiddleware, RegistrationController.getMyRegistrations);

// [PHASE 5] Webhook for payment gateway
router.post('/webhook', RegistrationController.handlePaymentWebhook);

// [PHASE 6] Polling registration status
router.get('/:id', authMiddleware, RegistrationController.getRegistrationStatus);

module.exports = router;
