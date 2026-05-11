const cron = require('node-cron');
const prisma = require('../config/db');

const RESERVED_TTL_HOURS = 24;
// Cron expression: every 10 minutes
const CRON_SCHEDULE = '*/10 * * * *';

/**
 * Finds every Registration that has been in `reserved` status for longer than
 * RESERVED_TTL_HOURS and releases each held seat back to its Workshop.
 *
 * Each record is processed in its own transaction so a single DB error does not
 * roll back the releases that have already succeeded.
 */
async function releaseReservedSeats() {
  const cutoff = new Date(Date.now() - RESERVED_TTL_HOURS * 60 * 60 * 1000);

  console.log(`[releaseReservedSeats] Running — cutoff: ${cutoff.toISOString()}`);

  let staleRegistrations;
  try {
    staleRegistrations = await prisma.registration.findMany({
      where: {
        status: 'reserved',
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
        await tx.registration.update({
          where: { id: registration.id },
          data: {
            status: 'cancelled',
            cancelled_at: new Date(),
          },
        });

        await tx.workshop.update({
          where: { id: registration.workshop_id },
          data: { available_seats: { increment: 1 } },
        });
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
  console.log(`[releaseReservedSeats] Scheduled — runs every 10 minutes.`);
}

module.exports = { startReleaseReservedSeatsJob };
