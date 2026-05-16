const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');

const router = Router();

/**
 * @route POST /v1/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post('/login', AuthController.login);

module.exports = router;
