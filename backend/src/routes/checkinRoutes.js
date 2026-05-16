const { Router } = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/rbacMiddleware');
const CheckinService = require('../services/checkinService');
const TicketService = require('../services/ticketService');

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
      const tickets = await CheckinService.getValidTickets(req.params.id);
      res.json(tickets);
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
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
      
      const results = await CheckinService.syncCheckins(checkins, req.user.id, deviceId);
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
      const qrToken = await TicketService.generateTicketJWT(req.params.id, req.user.id);
      res.json({ qrToken });
    } catch (error) {
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
);

module.exports = router;
