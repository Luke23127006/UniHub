const CheckinService = require('../services/checkinService');
const prisma = require('../config/db');
const jwt = require('jsonwebtoken');

jest.mock('../config/db', () => ({
  registration: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  checkin: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  qrCode: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
  },
  offlineSyncBatch: {
    create: jest.fn(),
  },
}));

jest.mock('jsonwebtoken');

describe('CheckinService', () => {
  const mockStaffId = '1';
  const mockDeviceId = 'test-device';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncCheckins', () => {
    it('should successfully sync a valid checkin', async () => {
      const mockTid = '3';
      const checkins = [{ tid: mockTid, client_timestamp: new Date().toISOString() }];
      
      prisma.checkin.findUnique.mockResolvedValue(null);
      prisma.registration.findUnique.mockResolvedValue({
        id: BigInt(mockTid),
        status: 'confirmed',
        qr_code: { id: BigInt(10) }
      });
      prisma.checkin.create.mockResolvedValue({ id: BigInt(1) });

      const result = await CheckinService.syncCheckins(checkins, mockStaffId, mockDeviceId);

      expect(result.synced).toBe(1);
      expect(prisma.checkin.create).toHaveBeenCalled();
    });

    it('should self-heal missing QR codes', async () => {
      const mockTid = '3';
      const checkins = [{ tid: mockTid }];
      
      prisma.checkin.findUnique.mockResolvedValue(null);
      prisma.registration.findUnique.mockResolvedValue({
        id: BigInt(mockTid),
        workshop_id: BigInt(101),
        status: 'confirmed',
        qr_code: null, // Missing QR
        student: { user_id: BigInt(2) }
      });
      prisma.student.findUnique.mockResolvedValue({ user_id: BigInt(2) });
      jwt.sign.mockReturnValue('mock-token');
      prisma.qrCode.create.mockResolvedValue({ id: BigInt(99) });
      prisma.checkin.create.mockResolvedValue({ id: BigInt(1) });

      const result = await CheckinService.syncCheckins(checkins, mockStaffId, mockDeviceId);

      expect(result.synced).toBe(1);
      expect(prisma.qrCode.create).toHaveBeenCalled();
      expect(prisma.checkin.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          qr_code: { connect: { id: BigInt(99) } }
        })
      }));
    });
  });
});
