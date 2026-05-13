import { useLocation, Link } from 'react-router';

export default function PaymentSuccessPage() {
  const location = useLocation();
  const ticketId = location.state?.ticketId || 'N/A';

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-12 px-4 flex items-center justify-center">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="max-w-md w-full relative z-10 text-center">
        <div className="mb-10 relative inline-block">
            <div className="absolute inset-0 bg-cyan-500 blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-2xl flex items-center justify-center mx-auto mb-8">
                <svg className="w-12 h-12 text-cyan-500 animate-[bounce_2s_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            
            <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">
                Payment Successful
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                Your workshop registration is confirmed. A digital ticket has been issued to your account.
            </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 shadow-xl mb-10 text-left">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">Ticket ID</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white font-mono">{ticketId}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">Status</span>
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Confirmed</span>
                    </span>
                </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
            <Link to={`/my-tickets/${ticketId}`} className="flex-1 py-4 px-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:shadow-2xl active:scale-[0.98]">
                View Ticket
            </Link>
            <Link to="/" className="flex-1 py-4 px-8 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98]">
                Back Home
            </Link>
        </div>
      </div>
    </div>
  );
}
