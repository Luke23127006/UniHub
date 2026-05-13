import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Runs a cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mocking some common things if needed
vi.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  User: () => <div data-testid="user-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  MoreHorizontal: () => <div data-testid="more-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  XCircle: () => <div data-testid="x-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Printer: () => <div data-testid="print-icon" />,
}));

// Mocking ResizeObserver which is often used by UI libs
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
