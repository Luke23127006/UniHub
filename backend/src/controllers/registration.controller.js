const crypto = require('crypto');
const prisma  = require('../config/db');
const { RegistrationService, RegistrationOutcome } = require('../services/registration.service');
const { queueNotification } = require('../services/notification/notification.service');

const OUTCOME_RESPONSES = {
  [RegistrationOutcome.FREE_CONFIRMED]: (res, { registrationId }) =>
    res.status(201).json({ message: 'Registration successful.', registrationId }),

  [RegistrationOutcome.PAID_PENDING_PAYMENT]: (res, { registrationId, paymentUrl }) =>
    res.status(201).json({ status: 'pending_payment', paymentUrl, registrationId }),

  [RegistrationOutcome.PAID_RESERVED_DEGRADED]: (res, { registrationId }) =>
    res.status(202).json({
      message: 'Payment gateway is under maintenance. Your seat is reserved. Please pay later.',
      registrationId,
    }),

  [RegistrationOutcome.PAID_GATEWAY_ERROR]: (res, { registrationId }) =>
    res.status(503).json({
      message: 'Payment gateway temporarily unavailable. Please try again later.',
      registrationId,
    }),
};

class RegistrationController {
  /**
   * POST /workshops/:id/register
   * Delegates all business logic to RegistrationService and maps the typed outcome
   * to the appropriate HTTP response.
   */
  static async registerWorkshop(req, res) {
    try {
      const workshopId = parseInt(req.params.id, 10);

      if (isNaN(workshopId) || workshopId <= 0) {
        return res.status(400).json({ message: 'Invalid workshop ID' });
      }

      const result = await RegistrationService.registerForWorkshop(workshopId, req.user.id);

      const outcomeResponse = OUTCOME_RESPONSES[result?.outcome];
      if (!outcomeResponse) {
        console.error('[RegistrationController] Unexpected registration outcome:', result?.outcome, result);
        return res.status(500).json({ message: 'Internal server error' });
      }
      // Respond immediately — notification must never block or fail the HTTP flow.
      const httpResponse = outcomeResponse(res, result);

      // Only FREE_CONFIRMED means the seat is secured right now.
      // Paid flows must queue after the payment webhook confirms settlement.
      if (result.outcome === RegistrationOutcome.FREE_CONFIRMED) {
        _queueTicketCreatedNotification(workshopId, req.user.id, result.registrationId)
          .catch((err) =>
            console.error('[RegistrationController] Notification queue error:', err.message),
          );
      }

      return httpResponse;
    } catch (error) {
      const status = error.statusCode ?? 500;
      if (status < 500) {
        return res.status(status).json({ message: error.message });
      }
      console.error('[RegistrationController] Unexpected error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

// ─── Private helper ──────────────────────────────────────────────────────────

/**
 * Resolves the workshop title and enqueues a ticket.created.event notification.
 *
 * Lives outside the class because it runs after the HTTP response is committed.
 * Any error is caught by the caller's .catch() and only logged — never surfaces
 * to the client.
 *
 * @param {number} workshopId
 * @param {bigint} userId
 * @param {string} registrationId  — stringified BigInt from RegistrationService
 */
async function _queueTicketCreatedNotification(workshopId, userId, registrationId) {
  const workshop = await prisma.workshop.findUnique({
    where:  { id: BigInt(workshopId) },
    select: { title: true },
  });

  // Mock QR token — swap for a real QrCode.create() once that service exists.
  const qrToken = crypto.randomUUID();

  await queueNotification(
    userId,
    'ticket.created.event',
    'registration',
    registrationId,
    {
      qrToken,
      workshopName:   workshop?.title ?? 'Workshop',
      registrationId,
    },
  );
}

module.exports = RegistrationController;
