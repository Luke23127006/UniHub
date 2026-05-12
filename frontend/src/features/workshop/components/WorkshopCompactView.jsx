import { Link } from 'react-router';
import StatusBadge from '@/components/StatusBadge';

const STATUS_DOT = {
  published: 'bg-emerald-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-400',
  draft: 'bg-gray-400',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatPrice(price, currency) {
  if (!price) return 'Free';
  if (currency === 'VND') return `${(price / 1000).toFixed(0)}k ₫`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price);
}

/**
 * Ultra-dense single-line view — best for scanning many workshops quickly.
 *
 * @param {{ workshops: Array }} props
 */
export default function WorkshopCompactView({ workshops }) {
  if (workshops.length === 0) {
    return (
      <div className="py-16 text-center text-unihub-muted dark:text-gray-500">
        No workshops match your filters.
      </div>
    );
  }

  return (
    <ul className="rounded-xl border border-unihub-border dark:border-gray-700 overflow-hidden divide-y divide-unihub-border dark:divide-gray-700">
      {workshops.map((w) => (
        <li
          key={w.id}
          className="flex items-center gap-3 px-4 py-2.5 bg-unihub-card dark:bg-gray-800 hover:bg-unihub-bg dark:hover:bg-gray-700 transition-colors"
        >
          {/* Status dot */}
          <span
            className={`shrink-0 w-2 h-2 rounded-full ${STATUS_DOT[w.status] ?? 'bg-gray-400'}`}
            aria-hidden="true"
          />

          {/* Title — fills available space */}
          <Link
            to={`/workshops/${w.id}`}
            className="flex-1 min-w-0 text-sm font-medium text-unihub-text dark:text-gray-200 hover:text-unihub-primary dark:hover:text-unihub-gold truncate"
          >
            {w.title}
          </Link>

          {/* Date */}
          <span className="hidden sm:block shrink-0 text-xs text-unihub-muted dark:text-gray-400 w-20 text-right">
            {formatDate(w.event_day)}
          </span>

          {/* Room */}
          <span className="hidden md:block shrink-0 text-xs text-unihub-muted dark:text-gray-400 w-20 text-center font-mono">
            {w.room?.room_code ?? 'TBA'}
          </span>

          {/* Seats */}
          <span className="shrink-0 text-xs text-unihub-muted dark:text-gray-400 w-16 text-center">
            {w.available_seats === 0 ? (
              <span className="text-red-500 dark:text-red-400 font-medium">Full</span>
            ) : (
              `${w.available_seats} left`
            )}
          </span>

          {/* Price */}
          <span className={`shrink-0 text-xs font-semibold w-16 text-right ${w.is_paid ? 'text-yellow-600 dark:text-yellow-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatPrice(w.price, w.currency)}
          </span>

          {/* Status badge — hidden on small screens to avoid clutter */}
          <span className="hidden lg:block shrink-0">
            <StatusBadge status={w.status} />
          </span>
        </li>
      ))}
    </ul>
  );
}
