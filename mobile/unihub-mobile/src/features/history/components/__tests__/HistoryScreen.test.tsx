import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../HistoryScreen';
import { HistoryService } from '../../services/HistoryService';

// Mocks
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: any }) => children,
}));

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock('@/features/qrcode/hooks/useCheckin', () => ({
  useCheckin: jest.fn(() => ({
    syncCheckinsToServer: jest.fn(),
    isSyncing: false,
  })),
}));

// Mock IconSymbol
jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: () => null,
}));

describe('HistoryScreen Pagination', () => {
  const mockData = {
    data: [
      { id: '1', studentName: 'Nguyen Van A', studentCode: 'S1', workshopTitle: 'WS 1', checkInTime: new Date().toISOString(), isLocalOnly: false },
    ],
    hasMore: true,
    total: 100,
    counts: { all: 100, synced: 80, pending: 20 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(HistoryService, 'getHistory').mockResolvedValue(mockData);
  });

  it('renders initial page of data', async () => {
    const { getByText, getAllByText } = render(<HistoryScreen />);
    
    // Check for loading state first
    expect(getByText('INITIALIZING DATA...')).toBeTruthy();

    // Wait for data to load
    await waitFor(() => {
      expect(getAllByText(/Nguyen Van A/i).length).toBeGreaterThan(0);
    });

    expect(getByText('CHECK-IN HISTORY')).toBeTruthy();
    // Use getAllByText because SYNCED appears in stats and card
    expect(getAllByText('SYNCED').length).toBeGreaterThan(0);
    expect(getAllByText('PENDING').length).toBeGreaterThan(0);
  });

  it('resets pagination when filter changes', async () => {
    const getHistorySpy = jest.spyOn(HistoryService, 'getHistory');
    const { getAllByText } = render(<HistoryScreen />);

    await waitFor(() => expect(getHistorySpy).toHaveBeenCalledWith(1, 15, '', 'all'));

    // The first 'PENDING' is the filter button
    const pendingBtn = getAllByText('PENDING')[0];
    fireEvent.press(pendingBtn);

    await waitFor(() => {
      // Should reset to page 1 with 'pending' filter
      expect(getHistorySpy).toHaveBeenCalledWith(1, 15, '', 'pending');
    });
  });
});
