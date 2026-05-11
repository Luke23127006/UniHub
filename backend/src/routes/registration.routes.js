const express = require('express');
const RegistrationController = require('../controllers/registration.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { workshopRegistrationLimiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

// Authenticate first so downstream middleware can use a trusted user identity
router.post('/:id/register', authMiddleware, workshopRegistrationLimiter, RegistrationController.registerWorkshop);

module.exports = router;
