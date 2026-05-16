'use strict';

jest.mock('../config/db', () => {
  const { mockDeep } = require('jest-mock-extended');
  return mockDeep();
});
jest.mock('../utils/qrToken');

const prisma = require('../config/db');
const { generateQrToken } = require('../utils/qrToken');
const TicketController = require('./ticket.controller');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('TicketController.getTicketQr', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── ID validation ────────────────────────────────────────────────────────────

  describe('invalid ticket IDs', () => {
    const cases = ['abc', '123abc', '', '-1', '0', '1.5'];

    test.each(cases)('returns 400 for "%s"', async (id) => {
      const req = { params: { id } };
      const res = makeRes();
      await TicketController.getTicketQr(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' }),
      );
      expect(prisma.registration.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── Not found ────────────────────────────────────────────────────────────────

  it('returns 404 when the registration does not exist', async () => {
    prisma.registration.findUnique.mockResolvedValue(null);
    const req = { params: { id: '99' } };
    const res = makeRes();
    await TicketController.getTicketQr(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: 'Ticket not found.' }),
    );
  });

  // ── Non-confirmed statuses ───────────────────────────────────────────────────

  const ineligibleStatuses = ['pending_payment', 'waitlisted', 'cancelled'];

  test.each(ineligibleStatuses)(
    'returns 403 for status "%s"',
    async (status) => {
      prisma.registration.findUnique.mockResolvedValue({
        id: BigInt(1),
        student_id: BigInt(7),
        workshop_id: BigInt(3),
        status,
      });
      const req = { params: { id: '1' } };
      const res = makeRes();
      await TicketController.getTicketQr(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' }),
      );
    },
  );

  // ── Success path ─────────────────────────────────────────────────────────────

  it('returns 200 with qr_token for a confirmed registration', async () => {
    prisma.registration.findUnique.mockResolvedValue({
      id: BigInt(42),
      student_id: BigInt(7),
      workshop_id: BigInt(3),
      status: 'confirmed',
    });
    generateQrToken.mockReturnValue('signed.jwt.token');

    const req = { params: { id: '42' } };
    const res = makeRes();
    await TicketController.getTicketQr(req, res);

    expect(prisma.registration.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: BigInt(42) } }),
    );
    expect(generateQrToken).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: BigInt(42),
        studentId: BigInt(7),
        workshopId: BigInt(3),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { qr_token: 'signed.jwt.token' },
    });
  });

  // ── Unexpected errors ────────────────────────────────────────────────────────

  it('returns JSON 500 when Prisma throws', async () => {
    prisma.registration.findUnique.mockRejectedValue(new Error('db crash'));
    const req = { params: { id: '1' } };
    const res = makeRes();
    await TicketController.getTicketQr(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error' }),
    );
  });
});
