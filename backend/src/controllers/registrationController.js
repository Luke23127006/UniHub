const { RegistrationService, RegistrationOutcome } = require('../services/registration.service');
const prisma = require('../config/db');

class RegistrationController {
  /**
   * [PHASE 5] Synchronous registration with immediate seat reservation.
   */
  static async registerSynchronous(req, res) {
    try {
      const { workshopId } = req.body;
      const userId = req.user.id;

      if (!workshopId) {
        return res.status(400).json({ message: 'Workshop ID is required' });
      }

      const result = await RegistrationService.registerForWorkshop(workshopId, userId);
      
      return res.status(201).json({
        message: 'Registration request processed.',
        registrationId: result.registrationId,
        paymentUrl: result.paymentUrl,
        outcome: result.outcome
      });
    } catch (error) {
      console.error('[RegistrationController] Error:', error.message);
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  /**
   * [PHASE 5] Webhook for payment gateway callback.
   */
  static async handlePaymentWebhook(req, res) {
    try {
      const { registrationId, status } = req.body;
      
      if (status === 'success' || status === 'completed') {
        await RegistrationService.confirmRegistration(registrationId);
      }
      
      return res.status(200).json({ message: 'Webhook received' });
    } catch (error) {
      console.error('[RegistrationController] Webhook Error:', error.message);
      return res.status(500).json({ message: error.message });
    }
  }

  /**
   * [PHASE 6] Get registration status and ticket info.
   */
  static async getRegistrationStatus(req, res) {
    try {
      const registrationId = BigInt(req.params.id);
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { workshop: true }
      });

      if (!registration) {
        return res.status(404).json({ message: 'Registration not found' });
      }

      return res.status(200).json({
        id: registration.id.toString(),
        status: registration.status,
        workshop: {
          title: registration.workshop.title,
          event_day: registration.workshop.event_day
        }
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = RegistrationController;
