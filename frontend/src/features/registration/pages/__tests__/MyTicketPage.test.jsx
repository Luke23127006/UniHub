import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import MyTicketPage from '../MyTicketPage';
import { MOCK_TICKETS } from '../../api';
import { describe, it, expect, vi } from 'vitest';

// Mock Radix Select
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }) => (
    <select 
      data-testid="status-select" 
      value={value} 
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }) => <>{children}</>,
  SelectValue: ({ placeholder }) => <option disabled>{placeholder}</option>,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));

describe('MyTicketPage', () => {
  const renderPage = (tickets = MOCK_TICKETS) => {
    const router = createMemoryRouter(
      [
        {
          path: '/my-tickets',
          element: <MyTicketPage />,
          loader: () => ({ tickets }),
        },
        { path: '/my-tickets/:id', element: <div data-testid="detail-page" /> },
        { path: '/checkout/:id', element: <div data-testid="checkout-page" /> },
        { path: '/workshops/:id', element: <div data-testid="workshop-page" /> },
      ],
      { initialEntries: ['/my-tickets'] }
    );

    return render(<RouterProvider router={router} />);
  };

  it('renders correctly with initial tickets and stat cards', async () => {
    renderPage();
    expect(await screen.findByText('My Registrations')).toBeInTheDocument();
    expect(screen.getByText('Total Tickets')).toBeInTheDocument();
    
    // Check if at least one ticket from mock data is visible
    expect(screen.getByText(MOCK_TICKETS[0].workshop.title)).toBeInTheDocument();
  });

  it('filters tickets by status correctly', async () => {
    renderPage();
    // Wait for loader to complete
    const select = await screen.findByTestId('status-select');
    
    // Filter by PENDING_PAYMENT
    fireEvent.change(select, { target: { value: 'PENDING_PAYMENT' } });
    
    const pendingTicket = MOCK_TICKETS.find(t => t.status === 'PENDING_PAYMENT');
    const confirmedTicket = MOCK_TICKETS.find(t => t.status === 'CONFIRMED');
    
    expect(screen.getByText(pendingTicket.workshop.title)).toBeInTheDocument();
    if (confirmedTicket) {
        expect(screen.queryByText(confirmedTicket.workshop.title)).not.toBeInTheDocument();
    }
  });

  it('searches tickets correctly', async () => {
    renderPage();
    // Wait for loader
    const searchInput = await screen.findByPlaceholderText(/Search by title or Ticket ID/i);
    
    // Search for a specific ticket ID
    const targetTicket = MOCK_TICKETS[0];
    fireEvent.change(searchInput, { target: { value: targetTicket.id } });
    
    expect(screen.getByText(`#${targetTicket.id}`)).toBeInTheDocument();
  });

  it('navigates to ticket details when clicking "View Ticket"', async () => {
    renderPage();
    // Wait for loader
    await screen.findByText('My Registrations');
    
    const confirmedTicket = MOCK_TICKETS.find(t => t.status === 'CONFIRMED');
    const viewTicketLinks = screen.getAllByRole('link', { name: /View Ticket/i });
    
    expect(viewTicketLinks[0]).toHaveAttribute('href', `/my-tickets/${confirmedTicket.id}`);
  });
});
