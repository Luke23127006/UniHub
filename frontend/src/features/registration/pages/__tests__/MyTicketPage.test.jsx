import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import MyTicketPage from '../MyTicketPage';
import { MOCK_TICKETS } from '../../api';
import { describe, it, expect, vi } from 'vitest';

// Mock Radix Select with a cleaner structure to avoid HTML validation warnings
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
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
}));

describe('MyTicketPage', () => {
  const renderPage = () => render(
    <MemoryRouter>
      <MyTicketPage />
    </MemoryRouter>
  );

  it('renders correctly with initial tickets', () => {
    renderPage();
    expect(screen.getByText('My Registrations')).toBeInTheDocument();
    // Check if at least one ticket from mock data is visible
    expect(screen.getByText(MOCK_TICKETS[0].workshop.title)).toBeInTheDocument();
  });

  it('filters tickets by status correctly', () => {
    renderPage();
    const select = screen.getByTestId('status-select');
    
    // Filter by PENDING
    fireEvent.change(select, { target: { value: 'PENDING' } });
    
    const pendingTicket = MOCK_TICKETS.find(t => t.status === 'PENDING');
    const confirmedTicket = MOCK_TICKETS.find(t => t.status === 'CONFIRMED');
    
    expect(screen.getByText(pendingTicket.workshop.title)).toBeInTheDocument();
    expect(screen.queryByText(confirmedTicket.workshop.title)).not.toBeInTheDocument();
  });

  it('searches tickets correctly', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText(/Search by title or Ticket ID/i);
    
    // Search for a specific ticket ID
    fireEvent.change(searchInput, { target: { value: 'TKT-1002' } });
    
    expect(screen.getByText('#TKT-1002')).toBeInTheDocument();
    expect(screen.queryByText('#TKT-1001')).not.toBeInTheDocument();
  });

  it('shows empty state when no tickets match filters', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText(/Search by title or Ticket ID/i);
    
    // Search for non-existent ticket
    fireEvent.change(searchInput, { target: { value: 'NON-EXISTENT' } });
    
    expect(screen.getByText('No tickets found')).toBeInTheDocument();
    expect(screen.getByText(/We couldn't find any tickets matching/i)).toBeInTheDocument();
  });

  it('navigates to ticket details when clicking "View Ticket"', () => {
    renderPage();
    const confirmedTicket = MOCK_TICKETS.find(t => t.status === 'CONFIRMED');
    const viewTicketLinks = screen.getAllByRole('link', { name: /View Ticket/i });
    
    // Check the first 'View Ticket' link
    expect(viewTicketLinks[0]).toHaveAttribute('href', `/my-tickets/${confirmedTicket.id}`);
  });
});
