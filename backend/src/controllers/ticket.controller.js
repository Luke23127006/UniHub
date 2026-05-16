'use strict';

const prisma = require('../config/db');
const { generateQrToken } = require('../utils/qrToken');

// Registrations whose payment is not yet settled must not receive a scannable QR.
const QR_ELIGIBLE_STATUSES = new Set(['confirmed']);

class TicketController {
  /**
   * GET /api/v1/tickets/:id/qr
   *
   * Issues a signed RS256 JWT for offline QR code verification.
   * In this schema a "ticket" is a Registration record — the two terms are
   * synonymous in UniHub's domain (registrations === issued tickets).
   */
  static async getTicketQr(req, res, next) {
    try {
      const registrationId = parseInt(req.params.id, 10);

      if (!Number.isInteger(registrationId) || registrationId <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid ticket ID — must be a positive integer.',
        });
      }

      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        select: {
          id: true,
          student_id: true,
          workshop_id: true,
          status: true,
        },
      });

      if (!registration) {
        return res.status(404).json({
          status: 'error',
          message: 'Ticket not found.',
        });
      }

      // Guard: only fully-confirmed registrations are entitled to a QR code.
      // pending_payment / waitlisted / cancelled registrations must not receive one.
      if (!QR_ELIGIBLE_STATUSES.has(registration.status)) {
        return res.status(403).json({
          status: 'error',
          message: `QR code is not available for registrations with status "${registration.status}".`,
        });
      }

      const qr_token = generateQrToken({
        ticketId: registration.id,
        studentId: registration.student_id,
        workshopId: registration.workshop_id,
      });

      return res.status(200).json({
        status: 'success',
        data: { qr_token },
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TicketController;
