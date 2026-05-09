const express = require('express');
const RegistrationController = require('../controllers/registrationController');
const authMiddleware = require('../middlewares/authMiddleware');
const { workshopRegistrationLimiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

// Apply mock auth middleware to extract user info
router.post('/:id/register', workshopRegistrationLimiter, authMiddleware, RegistrationController.registerWorkshop);

module.exports = router;
