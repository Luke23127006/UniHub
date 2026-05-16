const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');
const checkIdempotency = require('../middlewares/checkIdempotency.middleware');
const PaymentController = require('../controllers/paymentController');

const router = Router();

/**
 * POST /v1/payments/:id/confirm
 * Confirms a payment for a specific registration.
 * Protected by: Auth, RBAC(Student), and Idempotency.
 */
router.post(
  '/:id/confirm',
  verifyToken,
  requireRoles(['Student']),
  checkIdempotency,
  PaymentController.confirmPayment
);

module.exports = router;
