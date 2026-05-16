const { RegistrationService, RegistrationOutcome } = require('../services/registration.service');
const prisma = require('../config/db');

class RegistrationController {
  /**
   * [PHASE 5] Synchronous registration with immediate seat reservation.
   */
  static async registerSynchronous(req, res) {
    try {
      const { workshopId } = req.body;
      const userId = req.user.sub;

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
   * [PHASE 6] Get all registrations for the logged-in student.
   */
  static async getMyRegistrations(req, res) {
    try {
      const userId = req.user.sub;
      
      const student = await prisma.student.findUnique({
        where: { user_id: userId },
        select: { id: true }
      });

      if (!student) {
        return res.status(404).json({ message: 'Student record not found' });
      }

      const registrations = await prisma.registration.findMany({
        where: { student_id: student.id },
        include: {
          workshop: {
            include: {
              room: true
            }
          }
        },
        orderBy: { registered_at: 'desc' }
      });

      return res.status(200).json(registrations.map(r => ({
        id: r.id.toString(),
        workshop_id: r.workshop_id.toString(),
        status: r.status.toUpperCase(), // Normalize to uppercase for frontend
        payment_status: r.workshop.is_paid ? (r.status === 'confirmed' ? 'PAID' : 'PENDING') : 'FREE',
        workshop: {
          title: r.workshop.title,
          start_time: r.workshop.start_time,
          room: r.workshop.room ? {
            room_code: r.workshop.room.room_code,
            building: r.workshop.room.building
          } : null
        }
      })));
    } catch (error) {
      console.error('[RegistrationController] getMyRegistrations Error:', error.message);
      return res.status(500).json({ message: error.message });
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
   * [PHASE 6] Get registration status and full ticket details.
   */
  static async getRegistrationStatus(req, res) {
    try {
      const registrationId = BigInt(req.params.id);
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { 
          workshop: {
            include: { room: true }
          },
          student: true
        }
      });

      if (!registration) {
        return res.status(404).json({ message: 'Registration not found' });
      }

      // Generate QR token if confirmed
      let checkinToken = null;
      if (registration.status === 'confirmed') {
        const TicketService = require('../services/ticketService');
        try {
          // Note: we use req.user.sub for IDOR protection if needed, 
          // but here we just need to generate the token for the owner.
          checkinToken = await TicketService.generateTicketJWT(registration.id, registration.student.user_id);
        } catch (qrErr) {
          console.error('[RegistrationController] QR Generation failed:', qrErr.message);
        }
      }

      return res.status(200).json({
        id: registration.id.toString(),
        workshop_id: registration.workshop_id.toString(),
        status: registration.status.toUpperCase(),
        payment_status: registration.workshop.is_paid ? (registration.status === 'confirmed' ? 'PAID' : 'PENDING') : 'FREE',
        price: registration.workshop.price,
        currency: registration.workshop.currency || 'VND',
        checkin_token: checkinToken,
        workshop: {
          title: registration.workshop.title,
          start_time: registration.workshop.start_time,
          room: registration.workshop.room ? {
            room_code: registration.workshop.room.room_code,
            building: registration.workshop.room.building
          } : null
        },
        student: {
          full_name: registration.student.full_name,
          email: registration.student.email
        }
      });
    } catch (error) {
      console.error('[RegistrationController] getRegistrationStatus Error:', error.message);
      return res.status(500).json({ message: error.message });
    }
  }
}

module.exports = RegistrationController;
