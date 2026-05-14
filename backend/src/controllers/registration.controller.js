const { RegistrationService, RegistrationOutcome } = require('../services/registration.service');

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
      return outcomeResponse(res, result);
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

module.exports = RegistrationController;
