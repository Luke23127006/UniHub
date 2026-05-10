const { getChannel } = require('../config/rabbitmq');

class RegistrationController {
  /**
   * POST /workshops/:id/register
   * Pushes the registration payload into RabbitMQ and returns 202.
   */
  static async registerWorkshop(req, res) {
    try {
      const workshopId = parseInt(req.params.id, 10);
      const userId = req.user.id; // Set by authMiddleware (parseInt result)

      if (isNaN(workshopId) || workshopId <= 0) {
        return res.status(400).json({ message: 'Invalid workshop ID' });
      }

      // IDs are serialised as strings so the JSON payload is BigInt-safe for large IDs.
      // WorkshopService converts them to BigInt before any Prisma call.
      const payload = {
        workshopId: workshopId.toString(),
        userId: userId.toString(),
        timestamp: new Date().toISOString(),
      };

      const channel = getChannel();

      const sent = channel.sendToQueue(
        'workshop_registration_queue',
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
      );

      if (sent) {
        return res.status(202).json({
          message: 'Registration request accepted and is being processed.',
          workshopId,
        });
      }

      return res.status(500).json({ message: 'Failed to queue registration request.' });
    } catch (error) {
      console.error('Error in registerWorkshop controller:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = RegistrationController;
