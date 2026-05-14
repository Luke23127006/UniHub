import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLoaderData } from 'react-router';
import TicketDetailPage from '../TicketDetailPage';
import { MOCK_TICKETS } from '../../api';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useLoaderData: vi.fn(),
  };
});

describe('TicketDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => render(
    <MemoryRouter>
      <TicketDetailPage />
    </MemoryRouter>
  );

  it('renders ticket details correctly for a valid ticket', () => {
    const mockTicket = MOCK_TICKETS[0];
    useLoaderData.mockReturnValue(mockTicket);

    renderPage();

    expect(screen.getByText('Workshop Access Pass')).toBeInTheDocument();
    expect(screen.getByText(mockTicket.workshop.title)).toBeInTheDocument();
    // Match ID with prefix #
    expect(screen.getByText(new RegExp(`#${mockTicket.id}`, 'i'))).toBeInTheDocument();
    expect(screen.getByText(mockTicket.workshop.room.room_code)).toBeInTheDocument();
  });

  it('shows cancelled badge for a cancelled ticket', () => {
    const cancelledTicket = MOCK_TICKETS.find(t => t.status === 'CANCELLED');
    useLoaderData.mockReturnValue(cancelledTicket);

    renderPage();

    // The new UI displays the status in uppercase as returned by the API
    expect(screen.getByText('CANCELLED')).toBeInTheDocument();
  });

  it('shows error state when ticket is not found', () => {
    useLoaderData.mockReturnValue(null);

    renderPage();

    // New labels: 'System Error: Ticket Not Found' and 'Return to Terminal'
    expect(screen.getByText(/System Error: Ticket Not Found/i)).toBeInTheDocument();
    expect(screen.getByText(/Return to Registry/i)).toBeInTheDocument();
  });

  it('displays the QR code for check-in', () => {
    const mockTicket = MOCK_TICKETS[0];
    useLoaderData.mockReturnValue(mockTicket);

    renderPage();

    // Check if the QR area text exists (confirmed ticket shows READY FOR CHECK-IN)
    expect(screen.getByText('READY FOR CHECK-IN')).toBeInTheDocument();
    // In our test, QRCodeSVG is a component we don't necessarily need to test the internals of,
    // but we can check if it rendered (it's an SVG).
    const qrSvg = document.querySelector('svg');
    expect(qrSvg).toBeInTheDocument();
  });
});
