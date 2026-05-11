const prisma = require('../config/db');
const redlock = require('../config/redlock');
const paymentService = require('../services/paymentService');

const LOCK_TTL_MS = 2_000;

class RegistrationController {
  /**
   * POST /workshops/:id/register
   *
   * Flow:
   *  1. Acquire a distributed lock on the workshop to prevent seat over-selling.
   *  2. Pre-read workshop (is_paid, price) to decide the payment path before the tx.
   *  3. Inside a Prisma transaction: verify seats, find student, decrement, create Registration.
   *     - Free workshop            → status: confirmed
   *     - Paid + circuit OPEN      → status: reserved   (graceful degradation)
   *     - Paid + circuit CLOSED    → status: pending_payment
   *  4. For the CLOSED path only: call the mock payment gateway to obtain a paymentUrl.
   *  5. Release the lock (always, via finally).
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

      let lock;
      try {
        lock = await redlock.acquire([lockKey], LOCK_TTL_MS);
      } catch {
        return res.status(409).json({ message: 'Workshop is sold out' });
      }

      try {
        // Pre-read is_paid and price to decide the registration status before the tx.
        // The lock ensures no concurrent request modifies seats between this read and the tx.
        const workshopMeta = await prisma.workshop.findUnique({
          where: { id: workshopIdBig },
          select: { is_paid: true, price: true },
        });

        if (!workshopMeta) {
          return res.status(404).json({ message: 'Workshop not found' });
        }

        // Decide the degradation path once, outside the tx, so the tx always writes a
        // single correct status without any post-write patch.
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

        // ── Free workshop ────────────────────────────────────────────────────────
        if (!workshopMeta.is_paid) {
          return res.status(201).json({
            message: 'Registration successful.',
            registrationId: registration.id.toString(),
          });
        }

        // ── Paid + circuit OPEN (graceful degradation) ───────────────────────────
        if (degraded) {
          return res.status(202).json({
            message:
              'Payment gateway is under maintenance. Your seat is reserved. Please pay later.',
            registrationId: registration.id.toString(),
          });
        }

        // ── Paid + circuit CLOSED (normal flow) ──────────────────────────────────
        try {
          const { paymentUrl } = await paymentService.initiatePayment(
            registration.id,
            workshopMeta.price,
          );

          return res.status(201).json({
            status: 'pending_payment',
            paymentUrl,
            registrationId: registration.id.toString(),
          });
        } catch (paymentErr) {
          // The circuit breaker has already recorded the failure.
          // The registration exists as pending_payment; the client can retry with the
          // same idempotency key and will receive the same 503 until the circuit re-closes.
          console.error('[registerWorkshop] Payment gateway error:', paymentErr.message);
          return res.status(503).json({
            message: 'Payment gateway temporarily unavailable. Please try again later.',
            registrationId: registration.id.toString(),
          });
        }
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
