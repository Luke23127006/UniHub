import { Link } from 'react-router';
import StatusBadge from '@/components/StatusBadge';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatPrice(price, currency) {
  if (!price) return 'FREE';
  if (currency === 'VND') return `${price.toLocaleString('vi-VN')} ₫`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function SeatsPill({ capacity, available }) {
  const isFull = available === 0;
  const pct = capacity > 0 ? available / capacity : 0;
  const color = isFull
    ? 'text-rose-500'
    : pct <= 0.2
    ? 'text-orange-500'
    : 'text-cyan-600 dark:text-cyan-400';

  return (
    <span className={`text-xs font-mono font-bold ${color} tracking-tighter`}>
      {isFull ? 'FULL' : `${capacity - available}/${capacity}`}
    </span>
  );
}

const GRID_LAYOUT = "grid-cols-1 md:grid md:grid-cols-[2.5fr_1.5fr_1.2fr_80px_100px_160px] items-center gap-4";

export default function WorkshopListView({ workshops }) {
  if (workshops.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">No workshops match your criteria.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-800 shadow-xl">
      {/* Table header — hidden on mobile */}
      <div className={`hidden md:grid ${GRID_LAYOUT} px-6 py-4 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400`}>
        <span>Workshop Database</span>
        <span>Schedule / Time</span>
        <span>Location</span>
        <span className="text-center">Capacity</span>
        <span className="text-center">Status</span>
        <span className="text-right">Action</span>
      </div>

      <ul className="divide-y divide-gray-50 dark:divide-gray-800/50">
        {workshops.map((w) => (
          <li
            key={w.id}
            className={`group flex flex-col ${GRID_LAYOUT} px-6 py-5 bg-white dark:bg-gray-800 hover:bg-cyan-50/[0.02] dark:hover:bg-cyan-400/[0.02] transition-all duration-300 relative overflow-hidden`}
          >
            {/* Subtle Hover Sweep Line */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-cyan-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>

            {/* Title + speaker */}
            <div className="min-w-0">
              <Link
                to={`/workshops/${w.id}`}
                className="block font-black text-sm text-gray-900 dark:text-gray-100 hover:text-cyan-500 uppercase tracking-tighter truncate transition-colors"
              >
                {w.title}
              </Link>
              <p className="text-[10px] text-gray-400 font-medium italic truncate mt-1">
                {w.speakers.map((s) => s.full_name).join(', ') || 'Staff Personnel TBA'}
              </p>
            </div>

            {/* Date + time */}
            <div className="text-xs text-gray-600 dark:text-gray-400 font-mono font-bold">
              <p className="tracking-tight">{formatDate(w.event_day)}</p>
              <p className="text-[10px] text-gray-400 mt-1">{formatTime(w.start_time)} – {formatTime(w.end_time)}</p>
            </div>

            {/* Room */}
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tighter">{w.room?.room_code ?? 'TBA'}</p>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">{w.room?.building ?? 'TBA'}</p>
            </div>

            {/* Seats */}
            <div className="md:text-center">
               <SeatsPill capacity={w.capacity} available={w.available_seats} />
            </div>

            {/* Status */}
            <div className="flex md:justify-center">
              <StatusBadge status={w.status} className="bg-transparent p-0 text-[10px] font-black uppercase tracking-widest text-gray-500" />
            </div>

            {/* Price + action */}
            <div className="flex items-center justify-between md:justify-end gap-6">
              <span className={`text-[11px] font-black font-mono ${w.is_paid ? 'text-amber-600' : 'text-cyan-600'}`}>
                {formatPrice(w.price, w.currency)}
              </span>
              <Link
                to={`/workshops/${w.id}/register`}
                className={`relative group/btn overflow-hidden transition-all duration-300 ${
                  w.available_seats === 0 || w.status !== 'published' ? 'pointer-events-none opacity-20' : ''
                }`}
              >
                <div className="relative flex items-center justify-center py-2 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-black uppercase tracking-[0.2em] text-[9px] shadow-sm group-hover/btn:shadow-md transition-shadow">
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-black/5 to-transparent"></div>
                  
                  {w.status === 'cancelled' || w.status === 'completed' || w.status === 'draft' ? '—' : 
                   w.available_seats === 0 ? 'Full' : 'Entry'}
                </div>
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
