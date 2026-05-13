import { useLocation, Link } from 'react-router';

export default function PaymentFailurePage() {
  const location = useLocation();
  const error = location.state?.error || 'Transaction declined by issuer';

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-12 px-4 flex items-center justify-center">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="max-w-md w-full relative z-10 text-center">
        <div className="mb-10 relative inline-block">
            <div className="absolute inset-0 bg-rose-500 blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-2xl flex items-center justify-center mx-auto mb-8">
                <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            
            <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">
                Payment Failed
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                Something went wrong during the checkout process. Don't worry, your seat is still reserved for a few minutes.
            </p>
        </div>

        <div className="bg-rose-500/5 dark:bg-rose-500/10 rounded-3xl border border-rose-500/20 p-8 mb-10 text-center">
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 font-mono">Error Details</p>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 font-mono uppercase tracking-tight">{error}</p>
        </div>

        <div className="flex flex-col gap-4">
            <button 
                onClick={() => window.history.back()}
                className="w-full py-5 px-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:shadow-2xl active:scale-[0.98]"
            >
                Retry Payment
            </button>
            <Link to="/" className="w-full py-5 px-8 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98]">
                Cancel and Browse Workshops
            </Link>
        </div>
      </div>
    </div>
  );
}
