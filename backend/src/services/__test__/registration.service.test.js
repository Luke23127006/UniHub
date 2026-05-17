"use strict";

/**
 * Unit tests for RegistrationService.
 * No real Redis, PostgreSQL, or payment gateway connections are used.
 */

// Global BigInt serialization fix for Prisma (matches server.js)
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}

/**
 * prisma.$transaction is stubbed to call its callback immediately with `prisma`
 * itself as the `tx` argument. This means every `tx.*` call inside the service
 * resolves to the same mock functions as `prisma.*`, so we can chain
 * mockResolvedValueOnce to control what each sequential call returns.
 *
 * mockDeep (jest-mock-extended) is used for Prisma because it auto-mocks every
 * nested method via a Proxy, removing the need to list each one manually.
 */

// ── Mocks (must be declared before any require) ───────────────────────────────

const mockLock = { release: jest.fn() };

jest.mock("../../config/redlock", () => ({
  acquire: jest.fn(),
}));

jest.mock("../../config/db", () => {
  const { mockDeep } = require("jest-mock-extended");
  return mockDeep();
});

jest.mock("../paymentService", () => ({
  isCircuitOpen: jest.fn(),
  initiatePayment: jest.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const redlock = require("../../config/redlock");
const prisma = require("../../config/db");
const paymentService = require("../paymentService");
const {
  RegistrationService,
  RegistrationOutcome,
} = require("../registration.service");

// ── Shared fixture values ─────────────────────────────────────────────────────

const WORKSHOP_ID = 1;
const USER_ID = BigInt(1);
const STUDENT_ID = BigInt(10);
const WORKSHOP_DB_ID = BigInt(WORKSHOP_ID);
const REGISTRATION_ID = BigInt(99);
const PAYMENT_URL = "https://mock-gateway.com/pay/99";
const WORKSHOP_PRICE = 50_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Chains the two workshop.findUnique return values the service always makes:
 *    1st call → pre-read outside the transaction (is_paid, price)
 *    2nd call → seat-check inside the transaction (id, available_seats)  */
function setupWorkshop({ is_paid, price = null, available_seats = 5 }) {
  prisma.workshop.findUnique
    .mockResolvedValueOnce({ is_paid, price });
  
  // [PHASE 5] Mock $queryRaw for the seat check (SELECT ... FOR UPDATE)
  prisma.$queryRaw.mockResolvedValueOnce([{ id: WORKSHOP_DB_ID, available_seats }]);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("RegistrationService.registerForWorkshop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Lock: acquired successfully by default
    redlock.acquire.mockResolvedValue(mockLock);
    mockLock.release.mockResolvedValue(undefined);

    // Transaction: execute the callback immediately with prisma as tx.
    // Errors thrown inside the callback propagate naturally, so the service's
    // outer finally block still releases the lock even when the tx rejects.
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));

    // Default write stubs — overridden per-test where needed
    prisma.student.findUnique.mockResolvedValue({ id: STUDENT_ID });
    prisma.workshop.update.mockResolvedValue({});
    prisma.registration.create.mockResolvedValue({ id: REGISTRATION_ID });

    // Circuit: CLOSED by default
    paymentService.isCircuitOpen.mockReturnValue(false);
    paymentService.initiatePayment.mockResolvedValue({
      paymentUrl: PAYMENT_URL,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Lock acquisition fails
  // ────────────────────────────────────────────────────────────────────────────

  describe("when redlock.acquire() throws (lock contention or Redis error)", () => {
    beforeEach(() => {
      const lockErr = new Error('ExecutionError: lock already held');
      lockErr.name = 'ExecutionError';
      redlock.acquire.mockRejectedValue(lockErr);
    });

    it('throws a 503 error with message "Workshop registration is busy, please try again"', async () => {
      await expect(
        RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID),
      ).rejects.toMatchObject({
        statusCode: 503,
        message: 'Workshop registration is busy, please try again',
      });
    });

    it("does not attempt to release the lock because it was never acquired", async () => {
      await expect(
        RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID),
      ).rejects.toBeDefined();

      expect(mockLock.release).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Workshop not found at the pre-read stage (before the transaction)
  // ────────────────────────────────────────────────────────────────────────────

  describe("when the workshop does not exist (pre-read returns null)", () => {
    beforeEach(() => {
      prisma.workshop.findUnique.mockResolvedValue(null);
    });

    it('throws a 404 error with message "Workshop not found"', async () => {
      await expect(
        RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Workshop not found",
      });
    });

    it("still releases the lock via the finally block", async () => {
      await expect(
        RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID),
      ).rejects.toBeDefined();

      expect(mockLock.release).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Workshop is sold out (available_seats ≤ 0 inside the transaction)
  // ────────────────────────────────────────────────────────────────────────────

  describe("when available_seats is 0 at the time of the transaction", () => {
    beforeEach(() => {
      setupWorkshop({ is_paid: false, available_seats: 0 });
    });

    it('throws a 409 error with message "Workshop is sold out"', async () => {
      await expect(
        RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: "Workshop is sold out",
      });
    });

    it("does not decrement seats or create a registration", async () => {
      await expect(
        RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID),
      ).rejects.toBeDefined();

      expect(prisma.workshop.update).not.toHaveBeenCalled();
      expect(prisma.registration.create).not.toHaveBeenCalled();
    });

    it("still releases the lock via the finally block", async () => {
      await expect(
        RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID),
      ).rejects.toBeDefined();

      expect(mockLock.release).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Student record not found inside the transaction
  // ────────────────────────────────────────────────────────────────────────────

  describe("when the student record does not exist inside the transaction", () => {
    beforeEach(() => {
      setupWorkshop({ is_paid: false });
      prisma.student.findUnique.mockResolvedValue(null);
    });

    it('throws a 404 error with message "Student record not found"', async () => {
      await expect(
        RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "Student record not found",
      });
    });

    it("still releases the lock via the finally block", async () => {
      await expect(
        RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID),
      ).rejects.toBeDefined();

      expect(mockLock.release).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Free workshop — happy path
  // ────────────────────────────────────────────────────────────────────────────

  describe("when the workshop is free (is_paid = false)", () => {
    beforeEach(() => {
      setupWorkshop({ is_paid: false });
    });

    it('creates the registration with status "confirmed"', async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(prisma.registration.create).toHaveBeenCalledWith({
        data: {
          student_id: STUDENT_ID,
          workshop_id: WORKSHOP_DB_ID,
          status: "confirmed",
        },
      });
    });

    it("decrements available_seats by 1", async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(prisma.workshop.update).toHaveBeenCalledWith({
        where: { id: WORKSHOP_DB_ID },
        data: { available_seats: { decrement: 1 } },
      });
    });

    it("does not call paymentService.initiatePayment", async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(paymentService.initiatePayment).not.toHaveBeenCalled();
    });

    it("returns the FREE_CONFIRMED outcome with the registration ID", async () => {
      const result = await RegistrationService.registerForWorkshop(
        WORKSHOP_ID,
        USER_ID,
      );

      expect(result).toEqual({
        outcome: RegistrationOutcome.FREE_CONFIRMED,
        registrationId: REGISTRATION_ID.toString(),
      });
    });

    it("releases the lock after a successful registration", async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(mockLock.release).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 6. Paid workshop — circuit CLOSED (normal payment flow)
  // ────────────────────────────────────────────────────────────────────────────

  describe("when the workshop is paid and the payment circuit is CLOSED", () => {
    beforeEach(() => {
      paymentService.isCircuitOpen.mockReturnValue(false);
      setupWorkshop({ is_paid: true, price: WORKSHOP_PRICE });
    });

    it('creates the registration with status "pending_payment"', async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(prisma.registration.create).toHaveBeenCalledWith({
        data: {
          student_id: STUDENT_ID,
          workshop_id: WORKSHOP_DB_ID,
          status: "pending_payment",
        },
      });
    });

    it("decrements available_seats by 1", async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(prisma.workshop.update).toHaveBeenCalledWith({
        where: { id: WORKSHOP_DB_ID },
        data: { available_seats: { decrement: 1 } },
      });
    });

    it("calls initiatePayment with the registration ID and the workshop price", async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(paymentService.initiatePayment).toHaveBeenCalledWith(
        REGISTRATION_ID,
        WORKSHOP_PRICE,
      );
    });

    it("returns the PAID_PENDING_PAYMENT outcome with paymentUrl and registrationId", async () => {
      const result = await RegistrationService.registerForWorkshop(
        WORKSHOP_ID,
        USER_ID,
      );

      expect(result).toEqual({
        outcome: RegistrationOutcome.PAID_PENDING_PAYMENT,
        registrationId: REGISTRATION_ID.toString(),
        paymentUrl: PAYMENT_URL,
      });
    });

    it("releases the lock after a successful payment initiation", async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(mockLock.release).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 7. Paid workshop — circuit OPEN (graceful degradation)
  // ────────────────────────────────────────────────────────────────────────────

  describe("when the workshop is paid and the payment circuit is OPEN", () => {
    beforeEach(() => {
      paymentService.isCircuitOpen.mockReturnValue(true);
      setupWorkshop({ is_paid: true, price: WORKSHOP_PRICE });
    });

    it("does not call initiatePayment — the gateway is bypassed entirely", async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(paymentService.initiatePayment).not.toHaveBeenCalled();
    });

    it('creates the registration with status "reserved" to hold the seat', async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(prisma.registration.create).toHaveBeenCalledWith({
        data: {
          student_id: STUDENT_ID,
          workshop_id: WORKSHOP_DB_ID,
          status: "reserved",
        },
      });
    });

    it("returns the PAID_RESERVED_DEGRADED outcome without a paymentUrl", async () => {
      const result = await RegistrationService.registerForWorkshop(
        WORKSHOP_ID,
        USER_ID,
      );

      expect(result).toEqual({
        outcome: RegistrationOutcome.PAID_RESERVED_DEGRADED,
        registrationId: REGISTRATION_ID.toString(),
      });
      expect(result.paymentUrl).toBeUndefined();
    });

    it("releases the lock via the finally block (degraded path is not an error)", async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(mockLock.release).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 8. Paid workshop — circuit CLOSED but gateway call fails
  // ────────────────────────────────────────────────────────────────────────────

  describe("when the workshop is paid, circuit is CLOSED, but initiatePayment rejects", () => {
    beforeEach(() => {
      paymentService.isCircuitOpen.mockReturnValue(false);
      paymentService.initiatePayment.mockRejectedValue(
        new Error("Gateway timeout"),
      );
      setupWorkshop({ is_paid: true, price: WORKSHOP_PRICE });
    });

    it("returns the PAID_GATEWAY_ERROR outcome with the registrationId (no throw)", async () => {
      const result = await RegistrationService.registerForWorkshop(
        WORKSHOP_ID,
        USER_ID,
      );

      expect(result).toEqual({
        outcome: RegistrationOutcome.PAID_GATEWAY_ERROR,
        registrationId: REGISTRATION_ID.toString(),
      });
    });

    it("still releases the lock via the finally block", async () => {
      await RegistrationService.registerForWorkshop(WORKSHOP_ID, USER_ID);

      expect(mockLock.release).toHaveBeenCalledTimes(1);
    });
  });
});

describe('RegistrationService.confirmRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
  });

  it('updates registration status to confirmed and creates a payment record', async () => {
    prisma.registration.findUnique.mockResolvedValue({
      id: REGISTRATION_ID,
      status: 'pending_payment',
      workshop: { price: WORKSHOP_PRICE }
    });

    prisma.registration.update.mockResolvedValue({
      id: REGISTRATION_ID,
      status: 'confirmed',
      workshop: { price: WORKSHOP_PRICE }
    });

    await RegistrationService.confirmRegistration(REGISTRATION_ID);

    expect(prisma.registration.update).toHaveBeenCalledWith({
      where: { id: REGISTRATION_ID },
      data: { 
        status: 'confirmed',
        confirmed_at: expect.any(Date)
      },
      include: {
        student: true,
        workshop: true
      }
    });

    expect(prisma.payment.upsert).toHaveBeenCalledWith({
      where: { registration_id: REGISTRATION_ID },
      update: {
        status: 'completed',
        completed_at: expect.any(Date)
      },
      create: {
        registration_id: REGISTRATION_ID,
        amount: WORKSHOP_PRICE,
        currency: 'VND',
        status: 'completed',
        completed_at: expect.any(Date)
      }
    });
  });

  it('throws error if registration is not in pending_payment or reserved status', async () => {
    prisma.registration.findUnique.mockResolvedValue({
      id: REGISTRATION_ID,
      status: 'cancelled',
      workshop: { price: WORKSHOP_PRICE }
    });

    await expect(RegistrationService.confirmRegistration(REGISTRATION_ID))
      .rejects.toThrow('Registration is not in a confirmable state');
  });
});
