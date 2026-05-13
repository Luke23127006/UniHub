import { useLoaderData, Link } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
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
  const accentColor = isCancelled ? 'rose' : ticket.status === 'PENDING' ? 'amber' : 'cyan';

  // Static class maps — Tailwind's scanner cannot detect runtime-interpolated class names.
  const accentGlow = isCancelled
    ? 'from-gray-500/30'
    : 'from-cyan-500/30';
  const accentDot = isCancelled
    ? 'bg-gray-500'
    : 'bg-cyan-500';

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-12 px-4 overflow-hidden">
      
      {/* Background Tech Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:32px_32px]"></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-xl mx-auto relative z-10">
        
        {/* HUD Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/my-tickets" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-cyan-500 transition-colors">
            <span className="w-8 h-px bg-gray-300 dark:bg-gray-700"></span>
            ESC / BACK
          </Link>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <span className="text-[10px] font-mono font-bold text-cyan-500 uppercase">Live Connection</span>
          </div>
        </div>

        {/* The Digital Pass */}
        <div className={`relative group transition-all duration-500 ${isCancelled ? 'opacity-70 grayscale-[0.3]' : ''}`}>
          
          {/* Glowing Border Wrapper */}
          <div className={`absolute -inset-0.5 bg-gradient-to-br from-${accentColor}-500/50 to-purple-600/50 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000`}></div>
          
          <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
            
            {/* Top Bar Decoration */}
            <div className={`h-1.5 w-full bg-gradient-to-r from-${accentColor}-500 via-${accentColor}-400 to-transparent`}></div>

            {/* Content Area */}
            <div className="p-8 sm:p-10">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full bg-${accentColor}-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]`}></span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Workshop Access Pass</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tighter">
                    {ticket.workshop.title}
                  </h1>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Pass ID</p>
                  <p className="text-xs font-mono font-black text-gray-900 dark:text-white">#{ticket.id}</p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-gray-50 dark:border-gray-800/50">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center gap-1.5 pb-0.5">
                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700"></span> Schedule
                  </p>
                  <p className="text-[11px] font-bold text-gray-900 dark:text-white uppercase leading-normal pb-0.5">
                    {formatDateTime(ticket.workshop.start_time)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center gap-1.5 pb-0.5">
                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700"></span> Location
                  </p>
                  <p className="text-[11px] font-bold text-gray-900 dark:text-white uppercase leading-normal pb-0.5">
                    {ticket.workshop.room?.room_code}
                  </p>
                  <p className="text-[9px] text-gray-500 font-mono leading-normal pb-0.5">{ticket.workshop.room?.building}</p>
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center gap-1.5 pb-0.5">
                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700"></span> Identity
                  </p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{ticket.workshop.room?.room_code}</p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">{ticket.workshop.room?.building}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center gap-1.5 pb-0.5">
                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700"></span> Status
                  </p>
                  <p className={`text-[11px] font-black uppercase leading-normal pb-0.5 ${ticket.status === 'CONFIRMED' ? 'text-emerald-500' : ticket.status === 'CANCELLED' ? 'text-rose-500' : 'text-amber-500'}`}>
                    {ticket.status}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center gap-1.5 pb-0.5">
                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700"></span> Value
                  </p>
                  <p className="text-[11px] font-mono font-black text-gray-900 dark:text-white uppercase leading-normal pb-0.5">
                    VAL: {formatPrice(ticket.price, ticket.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Section: Scanning HUD */}
            <div className="relative bg-gray-50/50 dark:bg-gray-800/30 p-10 pb-12 flex flex-col items-center">
              
              {/* Animated scanning line */}
              {!isCancelled && (
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-[scan_3s_linear_infinite] z-20"></div>
              )}
              
              {/* Perforated edge effect */}
              <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 z-10"></div>
              <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 z-10"></div>

              {/* QR Code with Tech Frame */}
              <div className="relative p-6">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-500/40 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-500/40 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-500/40 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/40 rounded-br-lg"></div>

                <div className="bg-white p-3 rounded-xl shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                  <QRCodeSVG 
                    value={ticket.id} 
                    size={160} 
                    level="H"
                    fgColor={isCancelled ? "#94a3b8" : "#0f172a"}
                  />
                  {ticket.status !== 'CONFIRMED' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="bg-white/90 px-2 py-1 rounded text-[8px] font-black text-rose-500 border border-rose-200 uppercase tracking-tighter">INVALID</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-2">SCAN FOR CHECK-IN</p>
                <div className="flex items-center gap-4 text-[8px] font-mono text-gray-400 uppercase tracking-widest">
                  <span className="w-12 h-px bg-gray-300 dark:bg-gray-700"></span>
                  UNIHUB AUTHENTICATED
                  <span className="w-12 h-px bg-gray-300 dark:bg-gray-700"></span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom Actions - Hidden during print */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-3 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
          <button className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            Download
          </button>
          {!isCancelled && (
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to cancel this ticket? This action will release your seat.')) {
                  try {
                    await ticketApi.cancel(ticket.id);
                    window.location.reload(); // Refresh to show cancelled state
                  } catch (err) {
                    alert(err.message);
                  }
                }
              }}
              className="flex items-center justify-center gap-3 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 col-span-2 sm:col-span-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Cancel Ticket
            </button>
          )}
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
