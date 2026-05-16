const prisma = require('../config/db');
const redlock = require('../config/redlock');
const paymentService = require('./paymentService');

const LOCK_TTL_MS = 30_000;

/**
 * Typed outcomes returned to the controller.
 * The controller maps these to HTTP status codes and response shapes — the service
 * has no knowledge of HTTP.
 */
const RegistrationOutcome = Object.freeze({
  FREE_CONFIRMED: 'FREE_CONFIRMED',
  PAID_PENDING_PAYMENT: 'PAID_PENDING_PAYMENT',
  PAID_RESERVED_DEGRADED: 'PAID_RESERVED_DEGRADED',
  PAID_GATEWAY_ERROR: 'PAID_GATEWAY_ERROR',
});

class RegistrationService {
  /**
   * Registers a student for a workshop.
   *
   * Acquires a distributed lock, checks seat availability, decrements seats,
   * creates a Registration record, and (for paid workshops) calls the payment gateway.
   *
   * @param {number} workshopId
   * @param {bigint} userId      BigInt from authMiddleware
   * @returns {Promise<{ outcome: string, registrationId: string, paymentUrl?: string }>}
   * @throws {{ statusCode: number, message: string }} for 404 / 409 business errors
   */
  static async registerForWorkshop(workshopId, userId) {
    const workshopIdBig = BigInt(workshopId);
    const lockKey = `lock:workshop:${workshopId}`;

    let lock;
    try {
      lock = await redlock.acquire([lockKey], LOCK_TTL_MS);
    } catch (err) {
      const isLockContention = err?.name === 'ExecutionError';
      const error = new Error(isLockContention 
        ? 'Workshop registration is busy, please try again' 
        : 'Service temporarily unavailable');
      error.statusCode = 503;
      throw error;
    }

    try {
      const workshopMeta = await prisma.workshop.findUnique({
        where: { id: workshopIdBig },
        select: { is_paid: true, price: true },
      });

      if (!workshopMeta) {
        const err = new Error('Workshop not found');
        err.statusCode = 404;
        throw err;
      }

      if (workshopMeta.is_paid && workshopMeta.price == null) {
        const err = new Error('Workshop price is not configured');
        err.statusCode = 500;
        throw err;
      }

      const degraded = workshopMeta.is_paid && paymentService.isCircuitOpen();

      const registrationStatus = !workshopMeta.is_paid
        ? 'confirmed'
        : degraded
          ? 'reserved'
          : 'pending_payment';

      const registration = await prisma.$transaction(async (tx) => {
        // [PHASE 5] DB-level pessimistic lock using raw SQL
        const workshops = await tx.$queryRaw`SELECT id, available_seats FROM workshops WHERE id = ${workshopIdBig} FOR UPDATE`;
        const workshop = workshops[0];

        if (!workshop) {
          const err = new Error('Workshop not found');
          err.statusCode = 404;
          throw err;
        }

        if (workshop.available_seats <= 0) {
          const err = new Error('Workshop is sold out');
          err.statusCode = 409;
          throw err;
        }

        const student = await tx.student.findUnique({
          where: { user_id: userId },
          select: { id: true },
        });

        if (!student) {
          const err = new Error('Student record not found');
          err.statusCode = 404;
          throw err;
        }

        // Check if already registered
        const existing = await tx.registration.findUnique({
          where: { student_id_workshop_id: { student_id: student.id, workshop_id: workshopIdBig } }
        });
        if (existing) {
          const err = new Error('You are already registered for this workshop');
          err.statusCode = 400;
          throw err;
        }

        await tx.workshop.update({
          where: { id: workshopIdBig },
          data: { available_seats: { decrement: 1 } },
        });

        return tx.registration.create({
          data: {
            student_id: student.id,
            workshop_id: workshopIdBig,
            status: registrationStatus,
          },
        });
      });

      const registrationId = registration.id.toString();

      if (!workshopMeta.is_paid) {
        return { outcome: RegistrationOutcome.FREE_CONFIRMED, registrationId };
      }

      if (degraded) {
        return { outcome: RegistrationOutcome.PAID_RESERVED_DEGRADED, registrationId };
      }

      try {
        const { paymentUrl } = await paymentService.initiatePayment(
          registration.id,
          workshopMeta.price,
        );
        return { outcome: RegistrationOutcome.PAID_PENDING_PAYMENT, registrationId, paymentUrl };
      } catch (paymentErr) {
        console.error('[RegistrationService] Payment gateway error:', paymentErr.message);
        return { outcome: RegistrationOutcome.PAID_GATEWAY_ERROR, registrationId };
      }
    } finally {
      if (lock) {
        await lock.release().catch((err) => {
          console.error('[RegistrationService] Failed to release lock:', err.message);
        });
      }
    }
  }

  /**
   * Confirms a registration after successful payment.
   * Typically called by a webhook or after manual verification.
   *
   * @param {string|bigint} registrationId
   * @returns {Promise<Object>} The updated registration
   */
  static async confirmRegistration(registrationId) {
    const regIdBig = BigInt(registrationId);

    const result = await prisma.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({
        where: { id: regIdBig },
        include: { workshop: true }
      });

      if (!registration) {
        throw new Error('Registration not found');
      }

      if (registration.status === 'confirmed') {
        return registration;
      }

      if (registration.status !== 'pending_payment' && registration.status !== 'reserved') {
        const err = new Error('Registration is not in a confirmable state');
        err.statusCode = 400;
        throw err;
      }

      const updated = await tx.registration.update({
        where: { id: regIdBig },
        data: {
          status: 'confirmed',
          confirmed_at: new Date(),
        },
        include: {
          student: true,
          workshop: true
        }
      });

      // Record successful payment
      await tx.payment.upsert({
        where: { registration_id: regIdBig },
        update: {
          status: 'completed',
          completed_at: new Date(),
        },
        create: {
          registration_id: regIdBig,
          amount: updated.workshop.price || 0,
          currency: 'VND',
          status: 'completed',
          completed_at: new Date(),
        }
      });

      return updated;
    });

    // Step 15: Publish event for background workers
    try {
      const { getChannel } = require('../config/rabbitmq');
      const channel = getChannel();
      if (channel) {
        const message = {
          event: 'ticket.created',
          ticketId: result.id.toString(),
          studentId: result.student_id.toString(),
          workshopId: result.workshop_id.toString(),
          timestamp: new Date().toISOString()
        };
        channel.sendToQueue('workshop_registration_queue', Buffer.from(JSON.stringify(message)), {
          persistent: true
        });
        console.log(`[RegistrationService] Published ticket.created event for ID: ${result.id}`);
      }
    } catch (err) {
      console.warn('[RegistrationService] Failed to publish event to RabbitMQ:', err.message);
      // We don't throw here to avoid failing the payment confirmation if only the queue is down
    }

    return result;
  }
}

module.exports = { RegistrationService, RegistrationOutcome };
