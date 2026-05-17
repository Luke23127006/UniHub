const { RegistrationService } = require('../services/registration.service');
const paymentService = require('../services/payment.service');

class PaymentController {
  /**
   * Confirms a payment by verifying with the gateway and updating registration status.
   * 
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   */
  static async confirmPayment(req, res) {
    try {
      const { id: registrationId } = req.params;

      if (!registrationId) {
        return res.status(400).json({ message: 'Registration ID is required' });
      }

      // Step 1: Verify with Mock Payment Gateway
      const verification = await paymentService.verifyPayment(registrationId);

      if (!verification.success) {
        return res.status(402).json({
          success: false,
          message: 'Payment verification failed at gateway. Please ensure payment was completed.'
        });
      }

      // Step 2: Confirm registration in DB
      const registration = await RegistrationService.confirmRegistration(registrationId);

      return res.status(200).json({
        success: true,
        message: 'Payment confirmed and ticket issued.',
        ticket_id: registration.id.toString(),
        status: registration.status
      });
    } catch (error) {
      console.error('[PaymentController] Error:', error.message);

      // Handle Circuit Breaker Open state
      if (error.name === 'CircuitOpenError') {
        return res.status(503).json({
          message: 'Payment gateway is temporarily unavailable. Please try again in a few minutes.'
        });
      }

      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}

module.exports = PaymentController;
