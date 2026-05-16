const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');
const verifyOwner = require('../middlewares/ownerMiddleware');
const RegistrationController = require('../controllers/registration.controller');
const TicketController = require('../controllers/ticket.controller');
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
  RegistrationController.registerWorkshop
);

// GET /v1/tickets/:id/qr
// Guards: authenticated → Student role → must own this specific ticket (IDOR prevention)
router.get(
  '/:id/qr',
  verifyToken,
  requireRoles(['Student']),
  verifyOwner,
  TicketController.getTicketQr
);

// GET /v1/tickets/my-tickets
// Guards: authenticated → Student role (returns caller's own tickets)
router.get(
  '/my-tickets',
  verifyToken,
  requireRoles(['Student']),
  (req, res) => res.status(501).json({ message: 'myTickets – not yet implemented' })
);

module.exports = router;
