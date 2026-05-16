import { useLocation, Link, useSearchParams } from 'react-router';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticketId') || 'N/A';
  
  const [qrToken, setQrToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticketId !== 'N/A') {
      const token = localStorage.getItem('auth_token');
      fetch(`/api/v1/checkin/ticket/${ticketId}/qr`, {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      })
        .then(res => res.json())
        .then(data => {
          setQrToken(data.qrToken);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch QR token', err);
          setLoading(false);
        });
    }
  }, [ticketId]);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-12 px-4 flex items-center justify-center">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="max-w-md w-full relative z-10 text-center">
        <div className="mb-10 relative inline-block">
            <div className="absolute inset-0 bg-cyan-500 blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">
                Registration Confirmed
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                Your entry ticket has been generated. Show the QR code below at the venue.
            </p>
        </div>

        {/* QR Ticket Card */}
        <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 shadow-2xl mb-10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
            
            <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-3xl shadow-inner mb-6 border border-gray-50">
                    {loading ? (
                      <div className="w-[180px] h-[180px] flex items-center justify-center bg-gray-50 rounded-2xl animate-pulse">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Generating...</span>
                      </div>
                    ) : qrToken ? (
                      <QRCodeSVG 
                        value={qrToken} 
                        size={180}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "/favicon.ico",
                          x: undefined,
                          y: undefined,
                          height: 24,
                          width: 24,
                          excavate: true,
                        }}
                      />
                    ) : (
                      <div className="w-[180px] h-[180px] flex items-center justify-center bg-rose-50 rounded-2xl">
                        <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Failed</span>
                      </div>
                    )}
                </div>

                <div className="w-full space-y-3 pt-6 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Ticket ID</span>
                        <span className="text-[10px] font-black text-gray-900 dark:text-white font-mono">{ticketId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Status</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                            <div className="w-1 h-1 rounded-full bg-cyan-500"></div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Valid</span>
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Cutout circles for ticket look */}
            <div className="absolute top-1/2 -left-4 w-8 h-8 bg-gray-50 dark:bg-gray-950 rounded-full border border-gray-100 dark:border-gray-800"></div>
            <div className="absolute top-1/2 -right-4 w-8 h-8 bg-gray-50 dark:bg-gray-950 rounded-full border border-gray-100 dark:border-gray-800"></div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
            <Link to={`/my-tickets/${ticketId}`} className="flex-1 py-4 px-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:shadow-2xl active:scale-[0.98]">
                Management
            </Link>
            <Link to="/" className="flex-1 py-4 px-8 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98]">
                Discovery
            </Link>
        </div>
      </div>
    </div>
  );
}
