const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');
const WorkshopController = require('../controllers/workshop.controller');
const AiSummaryController = require('../controllers/aiSummary.controller');

const router = Router();

/**
 * @route   POST /api/ai/workshops/:id/summarize
 * @desc    Manual trigger for AI summary processing (Admin only)
 */
router.post(
  '/workshops/:id/summarize',
  verifyToken,
  requireRoles(['Admin']),
  AiSummaryController.requestSummary
);

/**
 * @route   PATCH /api/ai/internal/ai-summaries/:id
 * @desc    Internal callback for AI Worker to update results
 */
router.patch(
  '/internal/ai-summaries/:id',
  AiSummaryController.updateSummary
);

/**
 * @route   PATCH /api/ai/internal/jobs/:jobId
 * @desc    Internal callback for AI Worker to update temp PDF jobs
 */
router.patch(
  '/internal/jobs/:jobId',
  AiSummaryController.updateJobStatus
);

module.exports = router;
