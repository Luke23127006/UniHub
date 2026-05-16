import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckoutPage, { action } from '../CheckoutPage';
import { ticketApi } from '../../api';

vi.mock('../../api', () => ({
  ticketApi: { 
    getPaymentById: vi.fn(),
    confirmPayment: vi.fn()
  },
}));

const mockPayment = {
  id: 'PAY-123',
  amount: 150000,
  currency: 'VND',
  expires_at: new Date(Date.now() + 600000).toISOString(), // 10 mins from now
  workshop: {
    title: 'Advanced React Patterns',
    room: { room_code: 'Lab 2', building: 'Building A' }
  }
};

if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => 'test-idempotency-key';
}

function renderPage(payment = mockPayment) {
  const router = createMemoryRouter(
    [
      {
        path: '/checkout/:registrationId',
        element: <CheckoutPage />,
        loader: () => ({ payment, registrationId: '123' }),
        action,
      },
      { path: '/payment/success', element: <div data-testid="success-page" /> },
    ],
    { initialEntries: ['/checkout/123'] }
  );

  return render(<RouterProvider router={router} />);
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment details correctly', async () => {
    renderPage();

    expect(await screen.findByText(/CHECKOUT/i)).toBeInTheDocument();
    expect(screen.getByText(mockPayment.workshop.title)).toBeInTheDocument();
    expect(screen.getByText(/150.000 VND/i)).toBeInTheDocument();
    expect(screen.getByText(/SESSION_EXPIRES/i)).toBeInTheDocument();
  });

  it('calls confirmPayment API when EXECUTE_PAYMENT button is clicked', async () => {
    ticketApi.confirmPayment.mockResolvedValueOnce({ success: true, ticket_id: 'TKT-1' });

    renderPage();

    const payButton = await screen.findByText(/EXECUTE_PAYMENT/i);
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(ticketApi.confirmPayment).toHaveBeenCalledWith('123', expect.any(String));
    });
  });

  it('shows uploading state during payment execution', async () => {
    ticketApi.confirmPayment.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

    renderPage();

    const payButton = await screen.findByText(/EXECUTE_PAYMENT/i);
    fireEvent.click(payButton);

    expect(screen.getByText(/UPLOADING_HASH.../i)).toBeInTheDocument();
  });

  it('shows error message if payment fails', async () => {
    ticketApi.confirmPayment.mockRejectedValueOnce(new Error('Bank server down'));

    renderPage();

    const payButton = await screen.findByText(/EXECUTE_PAYMENT/i);
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(screen.getByText(/ERROR: Transaction could not be completed/i)).toBeInTheDocument();
    });
  });
});
