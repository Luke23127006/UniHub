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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-20 h-20 mb-6 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
          <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">System Error: Ticket Not Found</h2>
        <p className="mt-2 text-gray-500 font-mono text-sm uppercase">Access denied or resource moved.</p>
        <Link to="/my-tickets" className="mt-8 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-xl hover:scale-105 transition-transform uppercase tracking-widest text-xs">
          Return to Terminal
        </Link>
      </div>
    );
  }

  const isCancelled = ticket.status === 'CANCELLED';
  const accentColor = isCancelled ? 'rose' : ticket.status === 'PENDING' ? 'amber' : 'cyan';

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
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
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
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-[1.1] uppercase tracking-tighter">
                    {ticket.workshop.title}
                  </h1>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pass Index</p>
                  <p className="text-sm font-mono font-black text-gray-900 dark:text-white">#{ticket.id}</p>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-8 border-y border-gray-100 dark:border-gray-800 relative">
                {/* Visual tech decoration */}
                <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-gray-100 dark:border-gray-800 rounded-tr-xl"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b border-l border-gray-100 dark:border-gray-800 rounded-bl-xl"></div>

                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center gap-2">
                    <span className={`w-1 h-1 bg-${accentColor}-500`}></span> Schedule
                  </p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{formatDateTime(ticket.workshop.start_time)}</p>
                </div>

                <div className="space-y-1 text-right sm:text-left">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center justify-end sm:justify-start gap-2">
                    <span className={`w-1 h-1 bg-${accentColor}-500`}></span> Location
                  </p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">{ticket.workshop.room?.room_code}</p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">{ticket.workshop.room?.building}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center gap-2">
                    <span className={`w-1 h-1 bg-${accentColor}-500`}></span> Identity
                  </p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white uppercase">Member #9921</p>
                  <p className="text-[10px] text-gray-500 font-mono truncate">student@unihub.edu.vn</p>
                </div>

                <div className="space-y-1 text-right sm:text-left">
                  <p className="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest flex items-center justify-end sm:justify-start gap-2">
                    <span className={`w-1 h-1 bg-${accentColor}-500`}></span> Status
                  </p>
                  <div className="flex flex-col items-end sm:items-start">
                    <p className={`text-xs font-black uppercase ${ticket.status === 'CONFIRMED' ? 'text-emerald-500' : ticket.status === 'CANCELLED' ? 'text-rose-500' : 'text-amber-500'}`}>
                      {ticket.status}
                    </p>
                    <p className="text-[9px] text-gray-400 font-mono tracking-tighter">Val: {formatPrice(ticket.price, ticket.currency)}</p>
                  </div>
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

        {/* Bottom Actions */}
        <div className="mt-12 grid grid-cols-2 gap-4">
          <button className="flex items-center justify-center gap-3 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
          <button className="flex items-center justify-center gap-3 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-gray-900/10 dark:shadow-white/5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download
          </button>
        </div>
      </div>
      
      {/* Global CSS for scanning animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
