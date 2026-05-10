const express = require('express');
const RegistrationController = require('../controllers/registrationController');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');
const { workshopRegistrationLimiter } = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

router.post('/:id/register', verifyToken, requireRoles(['Student']), workshopRegistrationLimiter, RegistrationController.registerWorkshop);

module.exports = router;
