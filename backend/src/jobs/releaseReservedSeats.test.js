'use strict';

/**
 * Unit tests for the releaseReservedSeats background job.
 *
 * releaseReservedSeats() is not exported from the module — it is passed directly
 * as the callback to cron.schedule(). To test it without a real timer, we:
 *   1. Mock node-cron so schedule() is a jest.fn() that never fires.
 *   2. Call startReleaseReservedSeatsJob() once in beforeAll to register it.
 *   3. Extract the callback from cron.schedule.mock.calls[0][1] and store it
 *      in `runJob`. Tests invoke runJob() directly, giving us full control.
 *
 * prisma.$transaction is stubbed to execute its callback immediately with
 * `prisma` as the `tx` argument, mirroring the pattern in the service tests.
 */

// ── Mocks (must be declared before any require) ───────────────────────────────

jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

jest.mock('../config/db', () => {
  const { mockDeep } = require('jest-mock-extended');
  return mockDeep();
});

jest.mock('../config/redlock', () => ({
  acquire: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const cron = require('node-cron');
const prisma = require('../config/db');
const redlock = require('../config/redlock');
const { startReleaseReservedSeatsJob } = require('./releaseReservedSeats');

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('releaseReservedSeats background job', () => {
  // Extracted cron callback — invoked directly so tests never touch a real timer.
  let runJob;

  beforeAll(() => {
    // Suppress the "Scheduled" log that startReleaseReservedSeatsJob() emits.
    // The spy must be set up before the call so no output leaks into the runner.
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Register the cron job exactly once so cron.schedule receives the callback.
    startReleaseReservedSeatsJob();
    runJob = cron.schedule.mock.calls[0][1];

    redlock.acquire.mockResolvedValue({ release: jest.fn() });

    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default: transaction executes the callback with prisma itself as tx,
    // so tx.registration.update and tx.workshop.update resolve to the same
    // mock functions we can assert on.
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.registration.updateMany.mockResolvedValue({ count: 1 });
    prisma.workshop.update.mockResolvedValue({});

    redlock.acquire.mockResolvedValue({
      release: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Scheduling
  // ────────────────────────────────────────────────────────────────────────────

  describe('startReleaseReservedSeatsJob()', () => {
    it('registers the job with the correct cron expression (every 5 minutes)', () => {
      startReleaseReservedSeatsJob();

      expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. No expired reservations
  // ────────────────────────────────────────────────────────────────────────────

  describe('when no expired reserved registrations exist', () => {
    beforeEach(() => {
      prisma.registration.findMany.mockResolvedValue([]);
    });

    it('queries the DB for registrations with status "pending_payment" or "reserved" older than 15 minutes', async () => {
      await runJob();

      expect(prisma.registration.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['pending_payment', 'reserved'] },
          registered_at: { lt: expect.any(Date) },
        },
        select: { id: true, workshop_id: true },
      });
    });

    it('passes a cutoff timestamp that is approximately 15 minutes in the past', async () => {
      const before = Date.now();
      await runJob();
      const after = Date.now();

      const { lt: cutoff } = prisma.registration.findMany.mock.calls[0][0].where.registered_at;
      const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

      expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - FIFTEEN_MINUTES_MS);
      expect(cutoff.getTime()).toBeLessThanOrEqual(after - FIFTEEN_MINUTES_MS);
    });

    it('does not execute any transaction', async () => {
      await runJob();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('logs that no stale reservations were found and exits cleanly', async () => {
      await runJob();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No stale reservations found'),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Successful full release
  // ────────────────────────────────────────────────────────────────────────────

  describe('when multiple expired registrations are found and all transactions succeed', () => {
    const staleRegistrations = [
      { id: BigInt(1), workshop_id: BigInt(10) },
      { id: BigInt(2), workshop_id: BigInt(20) },
    ];

    beforeEach(() => {
      prisma.registration.findMany.mockResolvedValue(staleRegistrations);
    });

    it('executes exactly one transaction per stale registration', async () => {
      await runJob();

      expect(prisma.$transaction).toHaveBeenCalledTimes(staleRegistrations.length);
    });

    it('hard-deletes each registration with status "pending_payment" or "reserved"', async () => {
      await runJob();

      for (const reg of staleRegistrations) {
        expect(prisma.registration.updateMany).toHaveBeenCalledWith({
          where: { id: reg.id, status: 'reserved' },
          data: {
            status: 'cancelled',
            cancelled_at: expect.any(Date),
          },
        });
      }
    });

    it('increments available_seats by 1 for each associated workshop', async () => {
      await runJob();

      for (const reg of staleRegistrations) {
        expect(prisma.workshop.update).toHaveBeenCalledWith({
          where: { id: reg.workshop_id },
          data: { available_seats: { increment: 1 } },
        });
      }
    });

    it('does not call console.error on a clean run', async () => {
      await runJob();

      expect(console.error).not.toHaveBeenCalled();
    });

    it('logs the final counts with released = 2 and failed = 0', async () => {
      await runJob();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('released: 2, failed: 0'),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Partial failure
  // ────────────────────────────────────────────────────────────────────────────

  describe('when one transaction fails and the remaining one succeeds', () => {
    const dbError = new Error('Deadlock detected');
    const staleRegistrations = [
      { id: BigInt(3), workshop_id: BigInt(30) },  // will fail
      { id: BigInt(4), workshop_id: BigInt(40) },  // will succeed
    ];

    beforeEach(() => {
      prisma.registration.findMany.mockResolvedValue(staleRegistrations);
      prisma.$transaction
        .mockRejectedValueOnce(dbError)                       // first registration → fails
        .mockImplementationOnce(async (fn) => fn(prisma));   // second registration → succeeds
    });

    it('still attempts a transaction for every registration despite the earlier failure', async () => {
      await runJob();

      expect(prisma.$transaction).toHaveBeenCalledTimes(staleRegistrations.length);
    });

    it('logs a descriptive error containing the failing registration ID', async () => {
      await runJob();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(`registration ${staleRegistrations[0].id}`),
        dbError.message,
      );
    });

    it('calls console.error exactly once (only the failed transaction is logged)', async () => {
      await runJob();

      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('applies the database changes for the registration whose transaction succeeded', async () => {
      await runJob();

      // Only the second registration's updates reach the DB
      expect(prisma.registration.updateMany).toHaveBeenCalledTimes(1); // Only the successful one reached the inner call
      expect(prisma.registration.updateMany).toHaveBeenCalledWith({
        where: { id: staleRegistrations[1].id, status: 'reserved' },
        data: { status: 'cancelled', cancelled_at: expect.any(Date) },
      });

      expect(prisma.workshop.update).toHaveBeenCalledTimes(1);
      expect(prisma.workshop.update).toHaveBeenCalledWith({
        where: { id: staleRegistrations[1].workshop_id },
        data: { available_seats: { increment: 1 } },
      });
    });

    it('logs the final counts reflecting the partial failure: released = 1, failed = 1', async () => {
      await runJob();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('released: 1, failed: 1'),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 5. findMany query failure
  // ────────────────────────────────────────────────────────────────────────────

  describe('when prisma.registration.findMany rejects', () => {
    const queryError = new Error('Connection timeout');

    beforeEach(() => {
      prisma.registration.findMany.mockRejectedValue(queryError);
    });

    it('logs a descriptive error message for the query failure', async () => {
      await runJob();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to query stale registrations'),
        queryError.message,
      );
    });

    it('does not execute any transaction', async () => {
      await runJob();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not throw — the job returns cleanly so the cron scheduler stays alive', async () => {
      await expect(runJob()).resolves.toBeUndefined();
    });
  });
});
