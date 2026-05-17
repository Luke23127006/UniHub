const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');
const RegistrationController = require('../controllers/registration.controller');
const { workshopRegistrationLimiter } = require('../middlewares/rateLimitMiddleware');
const checkIdempotency = require('../middlewares/checkIdempotency.middleware');

const router = Router();

// POST /v1/tickets/register
// Guards: authenticated → Student role → rate limiter → idempotency check
router.post(
  '/register',
  verifyToken,
  requireRoles(['Student']),
  workshopRegistrationLimiter,
  checkIdempotency,
  RegistrationController.registerSynchronous
);

// GET /v1/tickets/my-tickets
// Guards: authenticated → Student role (returns caller's own tickets)
router.get(
  '/my-tickets',
  verifyToken,
  requireRoles(['Student']),
  RegistrationController.getMyRegistrations
);

module.exports = router;
