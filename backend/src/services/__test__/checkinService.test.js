'use strict';

const { mockDeep } = require('jest-mock-extended');

jest.mock('../../config/db', () => {
  return mockDeep();
});

const prisma = require('../../config/db');
const CheckinService = require('../checkinService');

describe('CheckinService', () => {
  const STAFF_USER_ID = BigInt(1);
  const WORKSHOP_ID = BigInt(100);
  const DEVICE_ID = 'test-device-uuid';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getValidTickets', () => {
    it('returns a list of confirmed registrations for a workshop', async () => {
      const mockRegistrations = [
        {
          id: BigInt(1),
          student: {
            student_code: 'STU001',
            full_name: 'Nguyen Van A',
            user_id: BigInt(10)
          },
          checkin: null
        },
        {
          id: BigInt(2),
          student: {
            student_code: 'STU002',
            full_name: 'Tran Thi B',
            user_id: BigInt(11)
          },
          checkin: { id: BigInt(50) }
        }
      ];

      prisma.registration.findMany.mockResolvedValue(mockRegistrations);

      const result = await CheckinService.getValidTickets(WORKSHOP_ID);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        tid: '1',
        sid: 'STU001',
        uid: '10',
        name: 'Nguyen Van A',
        checked_in: false
      });
      expect(result[1].checked_in).toBe(true);
      expect(prisma.registration.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { workshop_id: WORKSHOP_ID, status: 'confirmed' }
      }));
    });
  });

  describe('syncCheckins', () => {
    const checkins = [
      { tid: '1', client_timestamp: '2026-05-15T14:00:00Z' },
      { tid: '2', client_timestamp: '2026-05-15T14:05:00Z' }
    ];

    it('successfully syncs multiple check-ins', async () => {
      prisma.registration.findUnique.mockResolvedValue({ 
        id: BigInt(1), 
        status: 'confirmed',
        qr_code: { id: BigInt(100) } 
      });
      prisma.checkin.create.mockResolvedValue({ id: BigInt(1) });
      prisma.offlineSyncBatch.create.mockResolvedValue({ id: BigInt(1) });

      const result = await CheckinService.syncCheckins(checkins, STAFF_USER_ID, DEVICE_ID);

      expect(result.synced).toBe(2);
      expect(result.total).toBe(2);
      expect(prisma.checkin.create).toHaveBeenCalledTimes(2);
      expect(prisma.offlineSyncBatch.create).toHaveBeenCalled();
    });

    it('handles duplicate check-ins gracefully (idempotency - P2002)', async () => {
      prisma.registration.findUnique.mockResolvedValue({ 
        id: BigInt(1), 
        status: 'confirmed',
        qr_code: { id: BigInt(100) } 
      });
      
      // First one succeeds, second one fails with unique constraint error
      prisma.checkin.create
        .mockResolvedValueOnce({ id: BigInt(1) })
        .mockRejectedValueOnce({ code: 'P2002', message: 'Unique constraint failed' });

      const result = await CheckinService.syncCheckins(checkins, STAFF_USER_ID, DEVICE_ID);

      expect(result.synced).toBe(1);
      expect(result.already_synced).toBe(1);
      expect(result.total).toBe(2);
    });

    it('handles duplicate check-ins gracefully (idempotency - P2014)', async () => {
      prisma.registration.findUnique.mockResolvedValue({ 
        id: BigInt(1), 
        status: 'confirmed',
        qr_code: { id: BigInt(100) } 
      });
      
      prisma.checkin.create.mockRejectedValue({ code: 'P2014', message: 'Relation violation' });

      const result = await CheckinService.syncCheckins(checkins, STAFF_USER_ID, DEVICE_ID);

      expect(result.already_synced).toBe(2);
      expect(result.total).toBe(2);
    });

    it('handles invalid ticket IDs by incrementing failed count', async () => {
      prisma.registration.findUnique.mockResolvedValue(null); // Not found

      const result = await CheckinService.syncCheckins(checkins, STAFF_USER_ID, DEVICE_ID);

      expect(result.failed).toBe(2);
      expect(result.synced).toBe(0);
    });
  });
});
