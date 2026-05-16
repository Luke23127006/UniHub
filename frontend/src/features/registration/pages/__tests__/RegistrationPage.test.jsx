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

function renderPage(workshop = mockWorkshop) {
  const router = createMemoryRouter(
    [
      {
        path: '/workshops/:id/register',
        element: <RegistrationPage />,
        loader: () => ({ workshop }),
        action,
      },
      { path: '/my-tickets/:id', element: <div data-testid="ticket-page" /> },
      { path: '/checkout/:id', element: <div data-testid="checkout-page" /> },
      { path: '/payment/success', element: <div data-testid="success-page" /> },
    ],
    { initialEntries: ['/workshops/1/register'] }
  );

  return render(<RouterProvider router={router} />);
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
    ticketApi.register.mockResolvedValueOnce({ id: 'TKT-123', status: 'CONFIRMED', requires_payment: false });

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

  it('redirects to checkout page if payment is required', async () => {
    ticketApi.register.mockResolvedValueOnce({ id: 'TKT-999', requires_payment: true });

    renderPage();

    const confirmButton = await screen.findByText(/Complete Registration/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByTestId('checkout-page')).toBeInTheDocument();
    });
  });

  it('shows loading state when finalizing registration', async () => {
    // Delay the API response to capture the loading state
    ticketApi.register.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ id: '1' }), 100)));

    renderPage();

    const confirmButton = await screen.findByText(/Complete Registration/i);
    fireEvent.click(confirmButton);

    // Use findByText which is more resilient to async updates
    expect(await screen.findByText(/Finalizing\.\.\./i)).toBeInTheDocument();
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
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
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
