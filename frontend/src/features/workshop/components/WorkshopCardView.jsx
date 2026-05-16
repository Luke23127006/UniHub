import { Link } from 'react-router';
import StatusBadge from '@/components/StatusBadge';

/** Top accent bar colour driven by workshop status. */
const STATUS_ACCENT = {
  published: 'bg-cyan-500',
  completed: 'bg-gray-400',
  cancelled: 'bg-rose-400',
  draft: 'bg-amber-400',
};

function SeatsIndicator({ capacity, available }) {
  if (capacity === 0) return null;
  const filled = capacity - available;
  const pct = Math.round((filled / capacity) * 100);
  const barColor =
    available === 0
      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
      : pct >= 90
      ? 'bg-orange-500'
      : pct >= 70
      ? 'bg-amber-500'
      : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
        <span className="font-mono">{available === 0 ? 'STATUS: FULL' : `${available} SLOTS REMAINING`}</span>
        <span className="font-mono">CAP: {capacity}</span>
      </div>
      <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price, currency) {
  if (!price) return 'FREE ACCESS';
  const validCurrency = currency || 'VND';
  if (validCurrency === 'VND') return `${price.toLocaleString('vi-VN')} VND`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: validCurrency }).format(price);
}

export default function WorkshopCardView({ workshops }) {
  if (workshops.length === 0) {
    return (
      <div className="col-span-full py-20 text-center">
        <p className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">No workshops match your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {workshops.map((w) => (
        <article
          key={w.id}
          className="group relative flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:border-cyan-500/30 transition-all duration-500"
        >
          {/* Performant Tech Corner Brackets (Hover Only) */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
            <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-cyan-500/60 rounded-tl-sm group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition-transform duration-500"></div>
            <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-cyan-500/60 rounded-tr-sm group-hover:translate-x-[2px] group-hover:translate-y-[-2px] transition-transform duration-500"></div>
            <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-cyan-500/60 rounded-bl-sm group-hover:translate-x-[-2px] group-hover:translate-y-[2px] transition-transform duration-500"></div>
            <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-cyan-500/60 rounded-br-sm group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-transform duration-500"></div>
          </div>
          
          {/* Subtle Inner Scan Light (Single Axis - Efficient) */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-20 dark:group-hover:opacity-20 transition-opacity duration-500 z-10 overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500 to-transparent h-24 -translate-y-full group-hover:animate-[scan-down_1.5s_ease-in-out_infinite]"></div>
          </div>

          {/* Status accent bar */}
          <div className={`h-1 w-full relative z-10 ${STATUS_ACCENT[w.status] ?? 'bg-gray-300'}`} />

          <div className="relative z-10 flex flex-col flex-1 p-6 gap-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${w.status === 'published' ? 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-gray-400'}`}></div>
                <StatusBadge status={w.status} className="bg-transparent p-0 text-[10px] font-black uppercase tracking-widest text-gray-500" />
              </div>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                  w.is_paid
                    ? 'border-amber-500/20 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                    : 'border-cyan-500/20 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5'
                }`}
              >
                {formatPrice(w.price, w.currency)}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-black text-lg text-gray-900 dark:text-white leading-tight uppercase tracking-tighter line-clamp-2 min-h-[3rem]">
              <Link to={`/workshops/${w.id}`} className="hover:text-cyan-500 transition-colors">
                {w.title}
              </Link>
            </h3>

            {/* Description */}
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 flex-1 font-medium italic">
              {w.description}
            </p>

            {/* Meta Grid */}
            <div className="grid grid-cols-1 gap-3 py-4 border-y border-gray-50 dark:border-gray-800/50">
              <div className="flex items-center gap-3 text-xs font-bold text-gray-700 dark:text-gray-300">
                <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-mono">{formatDate(w.event_day)} · {formatTime(w.start_time)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-700 dark:text-gray-300">
                <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span className="truncate">{w.room?.room_code ?? 'TBA'} · {w.room?.building ?? 'TBA'}</span>
              </div>
            </div>

            {/* Seat bar */}
            <SeatsIndicator
              capacity={w.capacity}
              available={w.available_seats}
            />

            {/* CTA */}
            <Link
              to={`/workshops/${w.id}/register`}
              className={`relative mt-2 group/btn overflow-hidden transition-all duration-300 ${
                w.available_seats === 0 || w.status !== 'published' ? 'pointer-events-none opacity-40 grayscale' : ''
              }`}
            >
              <div className="relative flex items-center justify-center py-3 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-black uppercase tracking-[0.2em] text-[10px]">
                <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-black/5 to-transparent"></div>
                
                {w.status === 'cancelled' ? 'Cancelled' : 
                 w.status === 'completed' ? 'Session Ended' : 
                 w.status === 'draft' ? 'Not Open' : 
                 w.available_seats === 0 ? 'Full Capacity' : 'Secure Entry'}
              </div>
            </Link>
          </div>
        </article>
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes scan-down {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(300%); opacity: 0; }
        }
      `}} />
    </div>
  );
}
