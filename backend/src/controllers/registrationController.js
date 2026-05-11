const prisma = require('../config/db');
const redlock = require('../config/redlock');

const LOCK_TTL_MS = 2000;

class RegistrationController {
  /**
   * POST /workshops/:id/register
   * Acquires a distributed lock on the workshop, checks seat availability,
   * and atomically decrements seats + creates a Registration in one transaction.
   */
  static async registerWorkshop(req, res) {
    try {
      const rawId = req.params.id ?? req.body?.workshopId;
      const workshopId = parseInt(rawId, 10);
      const userId = req.user.sub; // Set by verifyToken (JWT sub claim)

      if (isNaN(workshopId) || workshopId <= 0) {
        return res.status(400).json({ message: 'Invalid workshop ID' });
      }

      const workshopIdBig = BigInt(workshopId);
      const lockKey = `lock:workshop:${workshopId}`;

      // Acquire distributed lock — fail fast (retryCount: 0) to avoid queuing requests.
      // If another request holds the lock, treat it as contention and return 409.
      let lock;
      try {
        lock = await redlock.acquire([lockKey], LOCK_TTL_MS);
      } catch {
        return res.status(409).json({ message: 'Workshop is sold out' });
      }

      try {
        const registration = await prisma.$transaction(async (tx) => {
          const workshop = await tx.workshop.findUnique({
            where: { id: workshopIdBig },
            select: { id: true, available_seats: true },
          });

          if (!workshop) {
            throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
          }

          if (workshop.available_seats <= 0) {
            throw Object.assign(new Error('Workshop is sold out'), { statusCode: 409 });
          }

          const student = await tx.student.findUnique({
            where: { user_id: userId },
            select: { id: true },
          });

          if (!student) {
            throw Object.assign(new Error('Student record not found'), { statusCode: 404 });
          }

          await tx.workshop.update({
            where: { id: workshopIdBig },
            data: { available_seats: { decrement: 1 } },
          });

          return tx.registration.create({
            data: {
              student_id: student.id,
              workshop_id: workshop.id,
              status: 'reserved',
            },
          });
        });

        return res.status(201).json({
          message: 'Registration successful.',
          registrationId: registration.id.toString(),
        });
      } catch (error) {
        const status = error.statusCode ?? 500;
        if (status < 500) {
          return res.status(status).json({ message: error.message });
        }
        throw error;
      } finally {
        await lock.release();
      }
    } catch (error) {
      console.error('[registerWorkshop] Unexpected error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

module.exports = RegistrationController;
