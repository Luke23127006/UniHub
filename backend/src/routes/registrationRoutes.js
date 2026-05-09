const express = require('express');
const RegistrationController = require('../controllers/registrationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Apply mock auth middleware to extract user info
router.post('/:id/register', authMiddleware, RegistrationController.registerWorkshop);

module.exports = router;
