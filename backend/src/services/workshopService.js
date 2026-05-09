const prisma = require('../config/db');

class WorkshopService {
  /**
   * Processes a workshop registration transaction.
   * Decrements available seats and creates a pending_payment Registration record.
   * 
   * @param {number} userId 
   * @param {number} workshopId 
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async processRegistration(userId, workshopId) {
    return await prisma.$transaction(async (tx) => {
      // 1. Check available_seats of the workshop
      const workshop = await tx.workshop.findUnique({
        where: { id: workshopId },
        select: { id: true, available_seats: true, capacity: true }
      });

      if (!workshop) {
        throw new Error(`Workshop ${workshopId} not found`);
      }

      // 2. Find the Student associated with the userId
      const student = await tx.student.findUnique({
        where: { user_id: userId },
        select: { id: true }
      });

      if (!student) {
        throw new Error(`Student record not found for user ${userId}`);
      }

      // 3. Check if user already registered
      const existingRegistration = await tx.registration.findUnique({
        where: {
          student_id_workshop_id: {
            student_id: student.id,
            workshop_id: workshop.id
          }
        }
      });

      if (existingRegistration) {
        throw new Error(`User ${userId} already registered for workshop ${workshopId}`);
      }

      if (workshop.available_seats > 0) {
        // Decrement available_seats
        await tx.workshop.update({
          where: { id: workshopId },
          data: { available_seats: { decrement: 1 } }
        });

        // Insert new Registration record
        await tx.registration.create({
          data: {
            student_id: student.id,
            workshop_id: workshop.id,
            status: 'pending_payment'
          }
        });

        return {
          success: true,
          message: `Successfully registered user ${userId} for workshop ${workshopId}`
        };
      } else {
        // Seats <= 0
        return {
          success: false,
          message: `Workshop ${workshopId} is sold out. Skipping registration for user ${userId}.`
        };
      }
    });
  }
}

module.exports = WorkshopService;
