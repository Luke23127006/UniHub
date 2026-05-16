const cron = require('node-cron');
const prisma = require('../config/db');
const redlock = require('../config/redlock');
const { RegistrationService } = require('../services/registration.service');

const RESERVED_TTL_MINUTES = 15;
const CRON_SCHEDULE = '*/5 * * * *'; // Run every 5 minutes for better responsiveness
const JOB_LOCK_KEY = 'lock:jobs:releaseReservedSeats';
const JOB_LOCK_TTL_MS = 4 * 60 * 1000;

/**
 * Finds every Registration that hasn't been confirmed within RESERVED_TTL_MINUTES
 * and releases each held seat back to its Workshop.
 * Covers both 'pending_payment' and 'reserved' statuses.
 */
async function releaseReservedSeats() {
  let jobLock;
  try {
    jobLock = await redlock.acquire([JOB_LOCK_KEY], JOB_LOCK_TTL_MS);
  } catch {
    console.log('[releaseReservedSeats] Another instance is running this job, skipping.');
    return;
  }

  try {
    await _releaseReservedSeats();
  } finally {
    try {
      await jobLock.release();
    } catch (err) {
      console.error('[releaseReservedSeats] Failed to release job lock:', err.message);
    }
  }
}

async function _releaseReservedSeats() {
  const cutoff = new Date(Date.now() - RESERVED_TTL_MINUTES * 60 * 1000);

  console.log(`[releaseReservedSeats] Running — cutoff: ${cutoff.toISOString()}`);

  let staleRegistrations;
  try {
    staleRegistrations = await prisma.registration.findMany({
      where: {
        status: { in: ['pending_payment', 'reserved'] },
        registered_at: { lt: cutoff },
      },
      select: { id: true, workshop_id: true },
    });
  } catch (err) {
    console.error('[releaseReservedSeats] Failed to query stale registrations:', err.message);
    return;
  }

  if (staleRegistrations.length === 0) {
    console.log('[releaseReservedSeats] No stale reservations found.');
    return;
  }

  console.log(`[releaseReservedSeats] Found ${staleRegistrations.length} stale reservation(s) to release.`);

  let released = 0;
  let failed = 0;

  for (const registration of staleRegistrations) {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Delete associated records first (dependency-first)
        await tx.checkin.deleteMany({ where: { registration_id: registration.id } });
        await tx.qrCode.deleteMany({ where: { registration_id: registration.id } });
        await tx.payment.deleteMany({ where: { registration_id: registration.id } });

        // 2. Hard-delete the registration
        const { count } = await tx.registration.deleteMany({
          where: {
            id: registration.id,
            status: { in: ['pending_payment', 'reserved'] },
          }
        });

        if (count > 0) {
          await tx.workshop.update({
            where: { id: registration.workshop_id },
            data: { available_seats: { increment: 1 } },
          });
        }
      });

      released++;
    } catch (err) {
      failed++;
      console.error(
        `[releaseReservedSeats] Transaction failed for registration ${registration.id}:`,
        err.message,
      );
    }
  }

  console.log(`[releaseReservedSeats] Done — released: ${released}, failed: ${failed}.`);
}

function startReleaseReservedSeatsJob() {
  cron.schedule(CRON_SCHEDULE, releaseReservedSeats);
  console.log(`[releaseReservedSeats] Scheduled — runs every 5 minutes.`);
}

module.exports = { startReleaseReservedSeatsJob };
