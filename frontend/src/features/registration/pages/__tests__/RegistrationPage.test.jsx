import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegistrationPage from '../RegistrationPage';
import { workshopApi } from '@/features/workshop/api';
import { ticketApi } from '../../api';

// Mock the APIs
vi.mock('@/features/workshop/api', () => ({
  workshopApi: {
    getById: vi.fn(),
  },
}));

vi.mock('../../api', () => ({
  ticketApi: {
    register: vi.fn(),
  },
}));

const mockWorkshop = {
  id: '1',
  title: 'Cybersecurity 101',
  description: 'Learn the basics of security.',
  start_time: '2026-05-20T09:00:00Z',
  price: 50000,
  currency: 'VND',
  available_seats: 10,
  capacity: 50,
  status: 'published',
  room: { room_code: 'Lab 5', building: 'Tech Block' },
};

// Mock useLoaderData
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useLoaderData: () => ({ workshop: mockWorkshop }),
    useNavigate: () => vi.fn(),
  };
});

// Mock crypto.randomUUID
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => 'test-uuid';
}

describe('RegistrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders workshop details for confirmation', () => {
    render(
      <MemoryRouter>
        <RegistrationPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Confirm Registration/i)).toBeInTheDocument();
    expect(screen.getByText(/Workshop Details/i)).toBeInTheDocument();
    expect(screen.getByText(mockWorkshop.title)).toBeInTheDocument();
    expect(screen.getByText(/50.000 VND/i)).toBeInTheDocument();
  });

  it('calls register API when confirm button is clicked', async () => {
    ticketApi.register.mockResolvedValueOnce({ id: 'TKT-123', status: 'CONFIRMED' });

    render(
      <MemoryRouter>
        <RegistrationPage />
      </MemoryRouter>
    );

    const confirmButton = screen.getByText(/Complete Registration/i);
    fireEvent.click(confirmButton);

    expect(confirmButton.closest('span')).toHaveTextContent(/Finalizing.../i);
    
    await waitFor(() => {
      expect(ticketApi.register).toHaveBeenCalledWith(mockWorkshop.id, expect.any(String));
    });
  });

  it('shows error message if registration fails', async () => {
    ticketApi.register.mockRejectedValueOnce(new Error('API Error'));

    render(
      <MemoryRouter>
        <RegistrationPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Complete Registration/i));

    await waitFor(() => {
      expect(screen.getByText(/Registration failed. Please try again later./i)).toBeInTheDocument();
    });
  });

  it('disables button when no seats available', () => {
    mockWorkshop.available_seats = 0;

    render(
      <MemoryRouter>
        <RegistrationPage />
      </MemoryRouter>
    );

    const button = screen.getByText(/Workshop Full/i);
    expect(button.closest('button')).toBeDisabled();
    
    // Reset
    mockWorkshop.available_seats = 10;
  });
});
