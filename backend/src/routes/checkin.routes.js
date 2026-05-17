const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');
const CheckinService = require('../services/checkin.service');
const TicketService = require('../services/ticket.service');

const router = Router();

/**
 * GET /v1/checkin/workshop/:id/tickets
 * Fetches all valid tickets for a workshop (Staff pre-fetch).
 */
router.get(
  '/workshop/:id/tickets',
  verifyToken,
  requireRoles(['Staff']),
  async (req, res) => {
    try {
      console.log(`[CheckinRoutes] Fetching tickets for workshop: ${req.params.id}`);
      const tickets = await CheckinService.getValidTickets(req.params.id);
      console.log(`[CheckinRoutes] Found ${tickets.length} tickets.`);
      res.json(tickets);
    } catch (error) {
      console.error(`[CheckinRoutes] Error for workshop ${req.params.id}:`, error.message);
      res.status(error.statusCode || 500).json({
        status: 'error',
        error: { message: error.message }
      });
    }
  }
);

/**
 * POST /v1/checkin/sync
 * Bulk offline sync from mobile device.
 */
router.post(
  '/sync',
  verifyToken,
  requireRoles(['Staff']),
  async (req, res) => {
    try {
      const { checkins, deviceId } = req.body;
      if (!Array.isArray(checkins)) {
        return res.status(400).json({ message: 'checkins must be an array' });
      }

      const results = await CheckinService.syncCheckins(checkins, req.user.sub, deviceId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * GET /v1/checkin/ticket/:id/qr
 * Generates a signed QR JWT for a student.
 */
router.get(
  '/ticket/:id/qr',
  verifyToken,
  async (req, res) => {
    try {
      const qrToken = await TicketService.generateTicketJWT(req.params.id, req.user.sub);
      res.json({ qrToken });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
);

/**
 * GET /v1/checkin/history
 * Fetches check-in history.
 */
router.get(
  '/history',
  verifyToken,
  requireRoles(['Staff']),
  async (req, res) => {
    try {
      const { page, limit, search } = req.query;
      const history = await CheckinService.getCheckinHistory({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        search
      });
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
