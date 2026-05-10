const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');
const verifyOwner = require('../middlewares/ownerMiddleware');
const RegistrationController = require('../controllers/registrationController');
const { workshopRegistrationLimiter } = require('../middlewares/rateLimitMiddleware');

const router = Router();

// POST /v1/tickets/register
// Three guards: authenticated → Student role → rate limiter (anti-flood)
router.post(
  '/register',
  verifyToken,
  requireRoles(['Student']),
  workshopRegistrationLimiter,
  RegistrationController.registerWorkshop
);

// GET /v1/tickets/:id/qr
// Three guards: authenticated → Student role → must own this specific ticket (IDOR prevention)
router.get(
  '/:id/qr',
  verifyToken,
  requireRoles(['Student']),
  verifyOwner,
  (req, res) => res.status(501).json({ message: 'getQrCode – not yet implemented' })
);

// GET /v1/tickets/my-tickets
// Two guards: authenticated → Student role (no ownership check – returns caller's own tickets)
router.get(
  '/my-tickets',
  verifyToken,
  requireRoles(['Student']),
  (req, res) => res.status(501).json({ message: 'myTickets – not yet implemented' })
);

module.exports = router;
