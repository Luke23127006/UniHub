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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const node = document.getElementById('ticket-pass');
    if (!node) {
      console.error('Element #ticket-pass not found');
      return;
    }

    try {
      // Use html2canvas for the most reliable DOM-to-Image conversion
      const canvas = await html2canvas(node, {
        backgroundColor: '#ffffff',
        scale: 3, // Very high quality for printing
        logging: false,
        useCORS: true,
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `UniHub-Ticket-${ticket.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Không thể tạo ảnh vé. Bạn vui lòng sử dụng nút Print và chọn "Lưu thành PDF" nhé!');
    }
  };

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
          Return to Registry
        </Link>
      </div>
    );
  }

  const isCancelled = ticket.status === 'CANCELLED';
  const accentColor = isCancelled ? 'gray' : 'cyan';

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-12 px-4 overflow-hidden">
      
      {/* Background Tech Elements - Optimized for performance */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-10 dark:opacity-20 print:hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:48px_48px]"></div>
        <div className="absolute top-20 left-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px]"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px]"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10 print:max-w-none print:m-0">
        
        {/* HUD Navigation - Hidden during print */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <Link to="/my-tickets" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-cyan-500 transition-colors">
            <span className="w-8 h-px bg-gray-300 dark:bg-gray-700"></span>
            ESC / BACK
          </Link>
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <span className="text-[10px] font-mono font-bold text-cyan-500 uppercase">Live Connection</span>
          </div>
        </div>

        {/* The Digital Boarding Pass */}
        <div id="ticket-pass" className={`relative group transition-all duration-500 print:opacity-100 print:grayscale-0 ${isCancelled ? 'opacity-70 grayscale-[0.3]' : ''}`}>
          
          {/* Subtle Glow - Optimized */}
          <div className={`absolute -inset-0.5 bg-gradient-to-br from-${accentColor}-500/30 to-purple-600/30 rounded-[2rem] blur-sm opacity-10 group-hover:opacity-20 transition duration-500 print:hidden`}></div>
          
          <div className="relative flex flex-col md:flex-row bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] shadow-xl overflow-hidden print:shadow-none print:border-gray-300">
            
            {/* Left Section: Info (70%) */}
            <div className="flex-[2] p-6 sm:p-8 border-b md:border-b-0 md:border-r border-dashed border-gray-200 dark:border-gray-800 relative">
              
              {/* Perforated circles */}
              <div className="hidden md:block absolute -right-3 top-0 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 z-10"></div>
              <div className="hidden md:block absolute -right-3 bottom-0 translate-y-1/2 w-6 h-6 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 z-10"></div>

              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full bg-${accentColor}-500`}></span>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Workshop Access Pass</span>
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
                  <p className="text-[11px] font-bold text-gray-900 dark:text-white uppercase leading-normal pb-0.5">Student Member</p>
                  <p className="text-[9px] text-gray-500 font-mono leading-normal pb-0.5">student@unihub.edu.vn</p>
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

            {/* Right Section: QR Stub */}
            <div className="w-full md:w-64 bg-gray-50/50 dark:bg-gray-800/30 p-6 flex flex-col items-center justify-center relative">
              
              {/* Optimized scan animation */}
              {!isCancelled && (
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/90 to-transparent animate-[scan_3s_linear_infinite] will-change-[top,opacity] z-20 print:hidden"></div>
              )}

              <div className="relative p-4 mb-4">
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/30 rounded-tl-sm"></div>
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/30 rounded-tr-sm"></div>
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/30 rounded-bl-sm"></div>
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/30 rounded-br-sm"></div>

                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <QRCodeSVG 
                    value={ticket.id} 
                    size={100} 
                    level="M"
                    fgColor={isCancelled ? "#94a3b8" : "#0f172a"}
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1 pb-0.5">SCAN FOR CHECK-IN</p>
                <p className="text-[7px] font-mono text-gray-400 uppercase tracking-widest pb-0.5">UNIHUB AUTHENTICATED</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions - Hidden during print */}
        <div className="mt-8 grid grid-cols-2 gap-4 print:hidden">
          <button 
            onClick={handlePrint}
            className="flex items-center justify-center gap-3 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center justify-center gap-3 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download
          </button>
        </div>
      </div>
      
      {/* Global CSS - Optimized */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          20% { opacity: 0.3; }
          80% { opacity: 0.3; }
          100% { top: 100%; opacity: 0; }
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 1cm !important;  
          }
          
          .print\\:hidden, nav, header, footer, button { display: none !important; }
          
          .max-w-4xl { max-width: none !important; margin: 0 !important; }
          
          #ticket-pass {
            position: relative !important;
            margin: 0 auto !important;
            width: 18cm !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 1.5rem !important;
            background: white !important;
            flex-direction: row !important;
            display: flex !important;
            page-break-inside: avoid;
            box-shadow: none !important;
          }

          #ticket-pass .flex-\\[2\\] { 
            border-right: 1px dashed #e2e8f0 !important; 
            border-bottom: none !important; 
            flex: 2 !important;
          }
          
          #ticket-pass .md\\:w-64 { 
            width: 6cm !important; 
            background-color: #f8fafc !important; 
            flex: 1 !important;
          }
          
          #ticket-pass, #ticket-pass * {
            color: #0f172a !important;
            border-color: #e2e8f0 !important;
            background-color: transparent !important;
          }

          #ticket-pass .bg-white { background-color: white !important; }
          .dark { background: white !important; }
        }
      `}} />
    </div>
  );
}
