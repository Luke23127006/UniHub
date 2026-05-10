const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');

const router = Router();

// POST /v1/checkin/scan  – online QR scan
router.post(
  '/scan',
  verifyToken,
  requireRoles(['Staff']),
  (req, res) => res.status(501).json({ message: 'scanCheckin – not yet implemented' })
);

// POST /v1/checkin/sync  – bulk offline sync
router.post(
  '/sync',
  verifyToken,
  requireRoles(['Staff']),
  (req, res) => res.status(501).json({ message: 'syncCheckin – not yet implemented' })
);

module.exports = router;
