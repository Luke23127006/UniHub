const prisma = require('../config/db');
const redlock = require('../config/redlock');
const paymentService = require('./paymentService');

const LOCK_TTL_MS = 2_000;

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
    } catch {
      throw Object.assign(new Error('Workshop is sold out'), { statusCode: 409 });
    }

    try {
      // Pre-read payment metadata so we can decide the registration status before
      // opening the write transaction. The lock prevents seat state from changing
      // between this read and the transaction below.
      const workshopMeta = await prisma.workshop.findUnique({
        where: { id: workshopIdBig },
        select: { is_paid: true, price: true },
      });

      if (!workshopMeta) {
        throw Object.assign(new Error('Workshop not found'), { statusCode: 404 });
      }

      // Decide degradation once, outside the tx, so the tx commits exactly one
      // correct status without needing a post-write patch.
      const degraded = workshopMeta.is_paid && paymentService.isCircuitOpen();

      const registrationStatus = !workshopMeta.is_paid
        ? 'confirmed'
        : degraded
          ? 'reserved'
          : 'pending_payment';

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

      // Circuit is CLOSED — attempt to initiate a payment session.
      try {
        const { paymentUrl } = await paymentService.initiatePayment(
          registration.id,
          workshopMeta.price,
        );
        return { outcome: RegistrationOutcome.PAID_PENDING_PAYMENT, registrationId, paymentUrl };
      } catch (paymentErr) {
        // Circuit breaker has already recorded the failure.
        // Registration stays as pending_payment; client can poll or retry.
        console.error('[RegistrationService] Payment gateway error:', paymentErr.message);
        return { outcome: RegistrationOutcome.PAID_GATEWAY_ERROR, registrationId };
      }
    } finally {
      await lock.release();
    }
  }
}

module.exports = { RegistrationService, RegistrationOutcome };
