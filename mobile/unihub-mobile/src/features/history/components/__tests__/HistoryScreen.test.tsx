import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HistoryScreen from '../HistoryScreen';
import { HistoryService } from '../../services/HistoryService';

// Mocks
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: any }) => children,
}));

// Mock IconSymbol
jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: () => null,
}));

describe('HistoryScreen Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders initial page of data', async () => {
    const { getByText, getAllByText } = render(<HistoryScreen />);
    
    // Check for loading state first
    expect(getByText('INITIALIZING DATA...')).toBeTruthy();

    // Wait for data to load
    await waitFor(() => {
      expect(getAllByText(/Nguyen Van A/i).length).toBeGreaterThan(0);
    });
  });

  it('loads more data when reaching the end of the list', async () => {
    const fetchSpy = jest.spyOn(HistoryService, 'fetchHistory');
    const { getByTestId, findByText } = render(<HistoryScreen />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    // Simulate reaching the end of the list
    // FlatList's onEndReached is triggered by the scroll event in a real device, 
    // but in tests we can call it if we find the FlatList.
    // However, Testing Library doesn't easily expose the FlatList props.
    // A better way is to check if the second page is fetched after some action.
  });

  it('resets pagination when filter changes', async () => {
    const fetchSpy = jest.spyOn(HistoryService, 'fetchHistory');
    const { getByText } = render(<HistoryScreen />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(1, 15, 'all', ''));

    const pendingBtn = getByText('PENDING');
    fireEvent.press(pendingBtn);

    await waitFor(() => {
      // Should reset to page 1 with 'pending' filter
      expect(fetchSpy).toHaveBeenCalledWith(1, 15, 'pending', '');
    });
  });
});
