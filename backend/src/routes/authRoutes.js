const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');

const verifyToken = require('../middlewares/authMiddleware');

const router = Router();

/**
 * @route POST /v1/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post('/login', AuthController.login);

/**
 * @route GET /v1/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', verifyToken, AuthController.getMe);

module.exports = router;
