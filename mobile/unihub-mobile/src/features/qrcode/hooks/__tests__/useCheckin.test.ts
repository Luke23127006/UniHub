import { renderHook, act } from '@testing-library/react-native';
import { useCheckin, CheckinResult } from '../useCheckin';
import { getDb } from '@/shared/utils/db';
import { apiClient } from '@/shared/api/api-client';
import { jwtDecode } from 'jwt-decode';

// Mocks
jest.mock('@/shared/utils/db');
jest.mock('@/shared/api/api-client');
jest.mock('jwt-decode');
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: true }),
}));

describe('useCheckin', () => {
  const mockDb: any = {
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    withTransactionAsync: jest.fn((callback) => callback()),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDb as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('performCheckin', () => {
    const qrData = 'mock-jwt-token';
    const workshopId = 'ws123';

    it('returns success when ticket is valid and not yet checked in', async () => {
      (jwtDecode as jest.Mock).mockReturnValue({ tid: 't1', wid: workshopId });
      mockDb.getFirstAsync.mockResolvedValue({ tid: 't1', status: 0, student_name: 'Nguyen Van A' });

      const { result } = renderHook(() => useCheckin());
      
      let checkinResult: CheckinResult | undefined;
      await act(async () => {
        checkinResult = await result.current.performCheckin(qrData, workshopId);
      });

      expect(checkinResult).toMatchObject({ success: true, studentName: 'Nguyen Van A' });
      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('UPDATE tickets'), expect.anything());
      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT OR IGNORE INTO sync_queue'), expect.anything());
    });

    it('returns error when ticket belongs to different workshop', async () => {
      (jwtDecode as jest.Mock).mockReturnValue({ tid: 't1', wid: 'wrong-workshop' });

      const { result } = renderHook(() => useCheckin());
      
      let checkinResult: CheckinResult | undefined;
      await act(async () => {
        checkinResult = await result.current.performCheckin(qrData, workshopId);
      });

      expect(checkinResult?.success).toBe(false);
      expect(checkinResult?.message).toContain('không thuộc Workshop');
    });

    it('returns error when ticket is already checked in', async () => {
      (jwtDecode as jest.Mock).mockReturnValue({ tid: 't1', wid: workshopId });
      mockDb.getFirstAsync.mockResolvedValue({ tid: 't1', status: 1 });

      const { result } = renderHook(() => useCheckin());
      
      let checkinResult: CheckinResult | undefined;
      await act(async () => {
        checkinResult = await result.current.performCheckin(qrData, workshopId);
      });
      if (checkinResult) {
        expect(checkinResult.success).toBe(false);
        expect(checkinResult.message).toContain('đã được check-in');
      }
    });
  });

  describe('syncCheckinsToServer', () => {
    it('calls API and marks as synced when items exist in queue', async () => {
      mockDb.getAllAsync.mockResolvedValue([{ id: 1, tid: 't1', client_timestamp: '...' }]);
      (apiClient.post as jest.Mock).mockResolvedValue({ ok: true });

      const { result } = renderHook(() => useCheckin());
      
      await act(async () => {
        await result.current.syncCheckinsToServer();
      });

      expect(apiClient.post).toHaveBeenCalledWith('/v1/checkin/sync', expect.anything());
      expect(mockDb.runAsync).toHaveBeenCalledWith(expect.stringContaining('UPDATE sync_queue SET synced = 1'), [1]);
    });
  });
});
