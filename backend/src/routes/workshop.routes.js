const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');
const WorkshopController = require('../controllers/workshop.controller');
const upload = require('../config/multer');

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
// GET /v1/workshops        – list open workshops
router.get('/', WorkshopController.list);

// GET /v1/workshops/rooms – list all active rooms
router.get('/rooms', verifyToken, WorkshopController.listRooms);

// GET /v1/workshops/speakers – list all speakers
router.get('/speakers', verifyToken, WorkshopController.listSpeakers);

// GET /v1/workshops/sse/seat-updates – realtime seat count stream (SSE)
router.get('/sse/seat-updates', WorkshopController.seatUpdatesSSE);

// GET /v1/workshops/:id    – workshop detail + AI summary
router.get('/:id', WorkshopController.getById);

// ── Admin ─────────────────────────────────────────────────────────────────────
// POST /v1/workshops
router.post(
  '/',
  verifyToken,
  requireRoles(['Admin']),
  WorkshopController.create
);

// PUT /v1/workshops/:id
router.put(
  '/:id',
  verifyToken,
  requireRoles(['Admin']),
  WorkshopController.update
);

// DELETE /v1/workshops/:id
router.delete(
  '/:id',
  verifyToken,
  requireRoles(['Admin']),
  WorkshopController.delete
);

// GET /v1/workshops/:id/stats  – Admin and Staff
router.get(
  '/:id/stats',
  verifyToken,
  requireRoles(['Admin', 'Staff']),
  (req, res) => res.status(501).json({ message: 'workshopStats – not yet implemented' })
);

// POST /v1/workshops/pdf-upload
router.post(
  '/pdf-upload',
  verifyToken,
  requireRoles(['Admin']),
  upload.single('file'),
  WorkshopController.uploadPdfAsync
);

// GET /v1/workshops/pdf-upload/:jobId
router.get(
  '/pdf-upload/:jobId',
  verifyToken,
  requireRoles(['Admin']),
  WorkshopController.getPdfJobStatus
);

module.exports = router;
