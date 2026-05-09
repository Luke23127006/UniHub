const { getChannel } = require('../config/rabbitmq');

class RegistrationController {
  /**
   * POST /workshops/:id/register
   * Pushes the registration payload into RabbitMQ and returns 202
   */
  static async registerWorkshop(req, res) {
    try {
      const workshopId = parseInt(req.params.id, 10);
      const userId = req.user.id; // Extracted from mocked auth middleware

      if (isNaN(workshopId)) {
        return res.status(400).json({ message: 'Invalid workshop ID' });
      }

      const payload = {
        workshopId,
        userId,
        timestamp: new Date().toISOString()
      };

      const channel = getChannel();
      
      // Push message to queue
      // Persistent: true ensures message is saved to disk so it won't be lost if RabbitMQ crashes
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
      } else {
        return res.status(500).json({ message: 'Failed to queue registration request.' });
      }
    } catch (error) {
      console.error('Error in registerWorkshop controller:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = RegistrationController;
