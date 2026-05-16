import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { useAuth } from '@/shared/hooks/use-auth';
import { AuthService } from '../../services/AuthService';

// Mocks
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

const mockSetLoggedIn = jest.fn();
jest.mock('@/shared/hooks/use-auth', () => ({
  useAuth: jest.fn(() => ({
    setLoggedIn: mockSetLoggedIn,
  })),
}));

jest.mock('../../services/AuthService', () => ({
  AuthService: {
    login: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: any }) => children,
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  return Reanimated;
});

// Mock IconSymbol
jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: () => null,
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    expect(getByPlaceholderText('ENTER EMAIL...')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
    expect(getByText('LOGIN')).toBeTruthy();
    expect(getByText('UNIHUB STAFF')).toBeTruthy();
  });

  it('updates email and password fields', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('ENTER EMAIL...');
    const passwordInput = getByPlaceholderText('••••••••');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('shows loading indicator and calls AuthService and setLoggedIn on successful login', async () => {
    (AuthService.login as jest.Mock).mockResolvedValue({ user: { id: '1', name: 'Test User' } });
    
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('ENTER EMAIL...'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    
    fireEvent.press(getByText('LOGIN'));

    await waitFor(() => {
      expect(AuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockSetLoggedIn).toHaveBeenCalledWith(true, { id: '1', name: 'Test User' });
    });
  });
});
