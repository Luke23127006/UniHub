const prisma = require('../config/db');

class WorkshopService {
  /**
   * Processes a workshop registration transaction.
   * Decrements available seats and creates a pending_payment Registration record.
   *
   * @param {number|string} userId
   * @param {number|string} workshopId
   * @returns {Promise<{success: boolean, message: string}>}
   */
  static async processRegistration(userId, workshopId) {
    // Prisma requires BigInt values for BigInt schema columns.
    // IDs arrive as JS numbers (from JSON payloads) or strings — both coerce correctly.
    const userIdBig = BigInt(userId);
    const workshopIdBig = BigInt(workshopId);

    return await prisma.$transaction(async (tx) => {
      // 1. Check available_seats of the workshop
      const workshop = await tx.workshop.findUnique({
        where: { id: workshopIdBig },
        select: { id: true, available_seats: true, capacity: true }
      });

      if (!workshop) {
        throw new Error(`Workshop ${workshopId} not found`);
      }

      // 2. Find the Student associated with the userId
      const student = await tx.student.findUnique({
        where: { user_id: userIdBig },
        select: { id: true }
      });

      if (!student) {
        throw new Error(`Student record not found for user ${userId}`);
      }

      // 3. Check if user already registered
      // student.id and workshop.id are already BigInt (returned by Prisma)
      const existingRegistration = await tx.registration.findUnique({
        where: {
          student_id_workshop_id: {
            student_id: student.id,
            workshop_id: workshop.id,
          }
        }
      });

      if (existingRegistration) {
        throw new Error(`User ${userId} already registered for workshop ${workshopId}`);
      }

      if (workshop.available_seats > 0) {
        await tx.workshop.update({
          where: { id: workshopIdBig },
          data: { available_seats: { decrement: 1 } }
        });

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
      }

      return {
        success: false,
        message: `Workshop ${workshopId} is sold out. Skipping registration for user ${userId}.`
      };
    });
  }
}

module.exports = WorkshopService;
