import { useLoaderData, Link } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { ticketApi } from '../api';

export async function loader({ params }) {
  return ticketApi.getById(params.id);
}

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

const CalendarIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// ─── Component ───────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const ticket = useLoaderData();

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket not found</h2>
        <p className="mt-2 text-gray-500">The ticket you are looking for does not exist or has been removed.</p>
        <Link to="/my-tickets" className="mt-6 text-unihub-primary dark:text-unihub-gold font-bold hover:underline">
          Go back to My Tickets
        </Link>
      </div>
    );
  }

  const isCancelled = ticket.status === 'CANCELLED';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header / Navigation */}
      <div className="mb-8 flex items-center justify-between">
        <Link to="/my-tickets" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors group">
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          BACK TO TICKETS
        </Link>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Print
          </button>
          <button className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            Download
          </button>
        </div>
      </div>

      {/* Ticket Layout */}
      <div className={`relative bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden ${isCancelled ? 'opacity-75 grayscale-[0.5]' : ''}`}>
        
        {/* Status Banner for Cancelled */}
        {isCancelled && (
          <div className="absolute top-12 -right-16 rotate-45 bg-rose-500 text-white px-20 py-2 text-xs font-black uppercase tracking-widest shadow-lg z-20">
            Cancelled
          </div>
        )}

        {/* Top Section: Workshop Info */}
        <div className="p-8 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex-1">
              <span className="inline-block px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-4 border border-cyan-100 dark:border-cyan-800/30">
                Workshop Access Pass
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
                {ticket.workshop.title}
              </h1>
            </div>
            <div className="shrink-0 flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ticket ID</span>
              <span className="text-sm font-mono font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-lg border border-gray-100 dark:border-gray-700">
                {ticket.id}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-y border-dashed border-gray-200 dark:border-gray-700">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <CalendarIcon />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date & Time</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">{formatDateTime(ticket.workshop.start_time)}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <MapPinIcon />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                    {ticket.workshop.room?.room_code}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.workshop.room?.building}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <UserIcon />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attendee</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">Student Hub Member</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">student@unihub.edu.vn</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="w-5 h-5 flex items-center justify-center text-gray-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price / Status</p>
                  <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                    {formatPrice(ticket.price, ticket.currency)}
                  </p>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${ticket.payment_status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {ticket.payment_status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: QR Code Area */}
        <div className="relative bg-gray-50 dark:bg-gray-900/50 p-10 flex flex-col items-center justify-center text-center">
          
          {/* Perforated circles on edges */}
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"></div>
          <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"></div>

          <div className="p-4 bg-white dark:bg-white rounded-2xl shadow-xl mb-6">
            <QRCodeSVG 
              value={ticket.id} 
              size={180} 
              level="H"
              includeMargin={false}
            />
          </div>
          
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-2">
            SCAN FOR CHECK-IN
          </p>
          <p className="text-[10px] text-gray-400 max-w-xs">
            Present this QR code at the workshop entrance for automatic check-in.
          </p>

          <div className="mt-10 flex items-center gap-2 text-[8px] font-mono text-gray-300 dark:text-gray-700 uppercase tracking-widest">
            <span>● UniHub Verified Ticket ●</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-10 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Need help? Contact support at support@unihub.edu.vn
        </p>
      </div>
    </div>
  );
}
