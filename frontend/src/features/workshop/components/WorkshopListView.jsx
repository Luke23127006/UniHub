import { Link } from 'react-router';
import StatusBadge from '@/components/StatusBadge';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatPrice(price, currency) {
  if (!price) return 'Free';
  if (currency === 'VND') return `${price.toLocaleString('vi-VN')} ₫`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function SeatsPill({ capacity, available }) {
  const isFull = available === 0;
  const pct = capacity > 0 ? available / capacity : 0;
  const color = isFull
    ? 'text-red-600 dark:text-red-400'
    : pct <= 0.2
    ? 'text-orange-500 dark:text-orange-400'
    : 'text-emerald-600 dark:text-emerald-400';

  return (
    <span className={`text-sm font-medium ${color}`}>
      {isFull ? 'Full' : `${available}/${capacity}`}
    </span>
  );
}

/**
 * Table-style horizontal list — each workshop occupies one row.
 * Stacks gracefully on narrow viewports via a responsive grid.
 *
 * @param {{ workshops: Array }} props
 */
export default function WorkshopListView({ workshops }) {
  if (workshops.length === 0) {
    return (
      <div className="py-16 text-center text-unihub-muted dark:text-gray-500">
        No workshops match your filters.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-unihub-border dark:border-gray-700 overflow-hidden">
      {/* Table header — hidden on mobile */}
      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto_auto] gap-4 px-5 py-3 bg-unihub-border/30 dark:bg-gray-700/50 text-xs font-semibold uppercase tracking-wide text-unihub-muted dark:text-gray-400">
        <span>Workshop</span>
        <span>Date & Time</span>
        <span>Room</span>
        <span>Seats</span>
        <span>Status</span>
        <span>Price</span>
      </div>

      <ul className="divide-y divide-unihub-border dark:divide-gray-700">
        {workshops.map((w) => (
          <li
            key={w.id}
            className="group flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_auto_auto] md:items-center gap-3 md:gap-4 px-5 py-4 bg-unihub-card dark:bg-gray-800 hover:bg-unihub-bg dark:hover:bg-gray-700 transition-colors"
          >
            {/* Title + speaker */}
            <div className="min-w-0">
              <Link
                to={`/workshops/${w.id}`}
                className="block font-semibold text-unihub-text dark:text-gray-100 hover:text-unihub-primary dark:hover:text-unihub-gold truncate"
              >
                {w.title}
              </Link>
              <p className="text-xs text-unihub-muted dark:text-gray-400 truncate mt-0.5">
                {w.speakers.map((s) => s.full_name).join(', ') || 'TBA'}
              </p>
            </div>

            {/* Date + time */}
            <div className="text-sm text-unihub-muted dark:text-gray-400">
              <p>{formatDate(w.event_day)}</p>
              <p className="text-xs">{formatTime(w.start_time)}–{formatTime(w.end_time)}</p>
            </div>

            {/* Room */}
            <div className="text-sm text-unihub-muted dark:text-gray-400">
              <p className="font-medium text-unihub-text dark:text-gray-300">{w.room?.room_code ?? 'TBA'}</p>
              <p className="text-xs truncate">{w.room?.building ?? 'TBA'}</p>
            </div>

            {/* Seats */}
            <SeatsPill capacity={w.capacity} available={w.available_seats} />

            {/* Status */}
            <StatusBadge status={w.status} />

            {/* Price + action */}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold ${w.is_paid ? 'text-yellow-600 dark:text-yellow-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatPrice(w.price, w.currency)}
              </span>
              <button
                disabled={w.available_seats === 0 || w.status !== 'published'}
                className="shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors
                  bg-unihub-primary text-white hover:bg-unihub-primary-hover
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {w.status === 'cancelled' || w.status === 'completed' || w.status === 'draft'
                  ? '—'
                  : w.available_seats === 0
                  ? 'Waitlist'
                  : 'Register'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
