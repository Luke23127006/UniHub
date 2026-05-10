const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
// GET /v1/workshops        – list open workshops (no auth required)
// GET /v1/workshops/:id    – workshop detail + AI summary (no auth required)
// These are intentionally left without middleware per the RBAC matrix.

// ── Admin ─────────────────────────────────────────────────────────────────────
// POST /v1/workshops
router.post(
  '/',
  verifyToken,
  requireRoles(['Admin']),
  (req, res) => res.status(501).json({ message: 'createWorkshop – not yet implemented' })
);

// PUT /v1/workshops/:id
router.put(
  '/:id',
  verifyToken,
  requireRoles(['Admin']),
  (req, res) => res.status(501).json({ message: 'updateWorkshop – not yet implemented' })
);

// DELETE /v1/workshops/:id
router.delete(
  '/:id',
  verifyToken,
  requireRoles(['Admin']),
  (req, res) => res.status(501).json({ message: 'deleteWorkshop – not yet implemented' })
);

// GET /v1/workshops/:id/stats  – Admin and Staff
router.get(
  '/:id/stats',
  verifyToken,
  requireRoles(['Admin', 'Staff']),
  (req, res) => res.status(501).json({ message: 'workshopStats – not yet implemented' })
);

module.exports = router;
