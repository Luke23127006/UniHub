import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_TICKETS } from '../api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(value) {
  if (!value) return 'TBA';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price, currency) {
  if (!price) return 'Free';
  if (currency === 'VND') return `${price.toLocaleString('vi-VN')} VND`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
  </svg>
);

const QrCodeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm13 0h3v3h-3v-3zm-3 3h3v3h-3v-3zm3 3h3v3h-3v-3zm-3-6h3v3h-3v-3z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// ─── Components ──────────────────────────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div className="relative overflow-hidden group rounded-2xl border border-unihub-border dark:border-gray-700/80 bg-white dark:bg-gray-800 px-6 py-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600">
      <div className="relative z-10">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          {label}
        </p>
        <p className="mt-2 text-3xl font-black tracking-tight text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function TicketStatusBadge({ status }) {
  const styles = {
    CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
}

function TicketCard({ ticket }) {
  const isConfirmed = ticket.status === 'CONFIRMED';
  
  // Elegant top border color instead of gradient
  const topBorderColor = isConfirmed ? 'bg-emerald-500' : ticket.status === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="group relative flex flex-col rounded-2xl border border-unihub-border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      
      {/* Solid elegant top bar */}
      <div className={`h-1 w-full ${topBorderColor}`}></div>
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4 gap-4">
          <TicketStatusBadge status={ticket.status} />
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500 font-medium">#{ticket.id}</span>
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 mb-4 group-hover:text-unihub-primary dark:group-hover:text-unihub-gold transition-colors">
          <Link to={`/workshops/${ticket.workshop_id}`} className="focus:outline-none">
            {ticket.workshop.title}
          </Link>
        </h3>
        
        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 font-medium">
            <div className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-700/50">
              <CalendarIcon />
            </div>
            {formatDateTime(ticket.workshop.start_time)}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300 font-medium">
            <div className="p-1.5 rounded-md bg-gray-50 dark:bg-gray-700/50">
              <LocationIcon />
            </div>
            {ticket.workshop.room?.room_code}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment</span>
          <span className={`text-sm font-bold ${ticket.payment_status === 'PAID' ? 'text-emerald-600 dark:text-emerald-400' : ticket.payment_status === 'FREE' ? 'text-blue-600 dark:text-blue-400' : ticket.payment_status === 'REFUNDED' ? 'text-gray-500' : 'text-amber-600 dark:text-amber-400'}`}>
            {ticket.payment_status}
          </span>
        </div>
        
        <Link 
          to={isConfirmed ? `/my-tickets/${ticket.id}` : `/checkout/${ticket.id}`}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all focus:ring-2 focus:outline-none ${isConfirmed ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 focus:ring-gray-900/50' : ticket.status === 'PENDING' ? 'bg-unihub-primary text-white hover:bg-red-800' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed'}`}
          onClick={(e) => ticket.status === 'CANCELLED' && e.preventDefault()}
        >
          {isConfirmed ? (
            <>
              <QrCodeIcon />
              View Ticket
            </>
          ) : ticket.status === 'PENDING' ? (
            'Complete Payment'
          ) : (
            'Cancelled'
          )}
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MyTicketPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const stats = useMemo(() => {
    return {
      total: MOCK_TICKETS.length,
      upcoming: MOCK_TICKETS.filter(t => t.status === 'CONFIRMED' && new Date(t.workshop.start_time) >= new Date()).length,
      pending: MOCK_TICKETS.filter(t => t.status === 'PENDING').length,
      cancelled: MOCK_TICKETS.filter(t => t.status === 'CANCELLED').length,
    };
  }, []);

  const filteredTickets = useMemo(() => {
    return MOCK_TICKETS.filter(t => {
      const matchesSearch = !search || t.workshop.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-12 bg-gray-50/30 dark:bg-gray-900/10">

      <div className="relative z-10 space-y-8 max-w-7xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            My Registrations
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 font-medium">
            Manage your workshop tickets, check-in QR codes, and pending payments.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard 
            label="Total Tickets" 
            value={stats.total} 
            accent={{ text: 'text-gray-900 dark:text-white', bg: 'from-gray-500 to-gray-400' }} 
          />
          <StatCard 
            label="Upcoming" 
            value={stats.upcoming} 
            accent={{ text: 'text-cyan-600 dark:text-cyan-400', bg: 'from-cyan-500 to-blue-500' }} 
          />
          <StatCard 
            label="Action Required" 
            value={stats.pending} 
            accent={{ text: 'text-orange-600 dark:text-orange-400', bg: 'from-orange-500 to-yellow-500' }} 
          />
          <StatCard 
            label="Cancelled" 
            value={stats.cancelled} 
            accent={{ text: 'text-red-600 dark:text-red-400', bg: 'from-red-500 to-rose-500' }} 
          />
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 w-full min-w-0">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="search"
              placeholder="Search by title or Ticket ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-auto shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-[42px] px-4 py-2.5 rounded-xl border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 focus:ring-cyan-500/50">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
                <SelectItem value="ALL" className="font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 cursor-pointer">All Status</SelectItem>
                <SelectItem value="CONFIRMED" className="font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 cursor-pointer">Confirmed</SelectItem>
                <SelectItem value="PENDING" className="font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 cursor-pointer">Pending</SelectItem>
                <SelectItem value="CANCELLED" className="font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 cursor-pointer">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tickets Grid */}
        {filteredTickets.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20">
            <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <SearchIcon />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No tickets found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              We couldn't find any tickets matching your current search and filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
