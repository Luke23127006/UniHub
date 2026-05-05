import StatusBadge from '@/components/StatusBadge';

/** Top accent bar colour driven by workshop status. */
const STATUS_ACCENT = {
  published: 'bg-emerald-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-red-400',
  draft: 'bg-gray-300 dark:bg-gray-600',
};

function SeatsIndicator({ capacity, available }) {
  if (capacity === 0) return null;
  const pct = Math.round((available / capacity) * 100);
  const barColor =
    available === 0
      ? 'bg-red-400'
      : pct <= 20
      ? 'bg-orange-400'
      : pct <= 50
      ? 'bg-yellow-400'
      : 'bg-emerald-400';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-unihub-muted dark:text-gray-400">
        <span>{available === 0 ? 'Full' : `${available} seats left`}</span>
        <span>{capacity} total</span>
      </div>
      <div className="h-1.5 rounded-full bg-unihub-border dark:bg-gray-600 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatPrice(price, currency) {
  if (!price) return 'Free';
  if (currency === 'VND') return `${price.toLocaleString('vi-VN')} ₫`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

/**
 * @param {{ workshops: Array }} props
 */
export default function WorkshopCardView({ workshops }) {
  if (workshops.length === 0) {
    return (
      <div className="col-span-full py-16 text-center text-unihub-muted dark:text-gray-500">
        No workshops match your filters.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {workshops.map((w) => (
        <article
          key={w.id}
          className="flex flex-col bg-unihub-card dark:bg-gray-800 border border-unihub-border dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Status accent bar */}
          <div className={`h-1 w-full ${STATUS_ACCENT[w.status] ?? 'bg-gray-300'}`} />

          <div className="flex flex-col flex-1 p-5 gap-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <StatusBadge status={w.status} />
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  w.is_paid
                    ? 'bg-unihub-gold/20 text-yellow-700 dark:text-yellow-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}
              >
                {formatPrice(w.price, w.currency)}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-unihub-text dark:text-gray-100 leading-snug line-clamp-2">
              {w.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-unihub-muted dark:text-gray-400 line-clamp-2 flex-1">
              {w.description}
            </p>

            {/* Meta */}
            <div className="space-y-1.5 text-sm text-unihub-muted dark:text-gray-400">
              <div className="flex items-center gap-2">
                {/* Calendar icon */}
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
                </svg>
                <span>
                  {formatDate(w.event_day)} · {formatTime(w.start_time)}–{formatTime(w.end_time)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Location icon */}
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="truncate">
                  {w.room.room_code} · {w.room.building}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Person icon */}
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span className="truncate">
                  {w.speakers.map((s) => s.full_name).join(', ')}
                </span>
              </div>
            </div>

            {/* Seat bar */}
            <SeatsIndicator capacity={w.capacity} available={w.available_seats} />

            {/* CTA */}
            <button
              disabled={w.available_seats === 0 || w.status !== 'published'}
              className="mt-1 w-full py-2 rounded-lg text-sm font-semibold transition-colors
                bg-unihub-primary text-white hover:bg-unihub-primary-hover
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {w.status === 'cancelled'
                ? 'Cancelled'
                : w.status === 'completed'
                ? 'Ended'
                : w.status === 'draft'
                ? 'Not Open Yet'
                : w.available_seats === 0
                ? 'Full — Join Waitlist'
                : 'Register'}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
