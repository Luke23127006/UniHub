import { useState, useEffect } from 'react';
import { useLoaderData, useNavigate, Link, Form, useNavigation, useActionData } from 'react-router';
import { ticketApi } from '../api';

export async function loader({ params }) {
  const payment = await ticketApi.getPaymentById(params.registrationId);
  return { payment, registrationId: params.registrationId };
}

export async function action({ params, request }) {
  const formData = await request.formData();
  const idempotencyKey = formData.get('idempotencyKey');

  try {
    const result = await ticketApi.confirmPayment(params.registrationId, idempotencyKey);
    return result;
  } catch (err) {
    console.error('Payment failed', err);
    return { error: 'Transaction could not be completed. Please try again.' };
  }
}

function formatPrice(price, currency) {
  if (!price) return 'Free';
  if (currency === 'VND') return `${price.toLocaleString('vi-VN')} VND`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

export default function CheckoutPage() {
  const { payment } = useLoaderData();
  const actionData = useActionData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (actionData?.success) {
      navigate(`/payment/success?ticketId=${actionData.ticket_id}`);
    } else if (actionData?.success === false) {
      navigate('/payment/failure', { state: { error: actionData.message || 'Payment failed' } });
    }
  }, [actionData, navigate]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(payment.expires_at) - new Date();
      return Math.max(0, Math.floor(difference / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [payment.expires_at]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const error = actionData?.error || (timeLeft <= 0 ? 'Payment window expired. Please start over.' : null);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6 bg-transparent flex items-center justify-center overflow-hidden">
      
      {/* Infinite Cyber Space Background with Global 4-way Fade */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ 
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 85%)'
        }}
      >
        {/* Animated Infinite Grid */}
        <div 
          className="absolute inset-[-50%] opacity-[0.5] dark:opacity-50 animate-grid-flow text-cyan-500/90 dark:text-cyan-500/80" 
          style={{ 
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        ></div>
        
        {/* Radial Depth Overlay - Dark Mode Only */}
        <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>

        {/* 3D Depth Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className={`absolute rounded-full bg-cyan-500/30 dark:bg-cyan-500/20 animate-float`}
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                filter: `blur(${Math.random() * 1.5}px)`,
                opacity: Math.random() * 0.4 + 0.1,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${12 + Math.random() * 18}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl w-full relative z-10">
  


        
        <div className="flex justify-between items-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group">
              <svg className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Abort_Transaction
            </Link>

            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border backdrop-blur-md transition-all ${timeLeft < 60 ? 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-500' : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-600 dark:text-cyan-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${timeLeft < 60 ? 'bg-rose-500 animate-pulse' : 'bg-cyan-500 dark:bg-cyan-400 animate-pulse'}`}></div>
                <span className="text-[10px] font-black font-mono tracking-[0.2em]">SESSION_EXPIRES: {formatTime(timeLeft)}</span>
            </div>
        </div>

        <div className="relative group">
          {/* HUD Corner Brackets */}
          <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-500/40 dark:border-cyan-500/50"></div>
          <div className="absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-500/40 dark:border-cyan-500/50"></div>
          <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-500/40 dark:border-cyan-500/50"></div>
          <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-500/40 dark:border-cyan-500/50"></div>

          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-[0_0_50px_-12px_rgba(34,211,238,0.2)] overflow-hidden relative">
            
            {/* Cyber Scanning Line */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
               <div className="w-full h-[120px] bg-gradient-to-b from-transparent via-cyan-500/10 dark:via-cyan-500/10 to-transparent absolute top-0 left-0 animate-scan"></div>
               <div className="w-full h-[1px] bg-cyan-500/70 dark:bg-cyan-400/50 absolute top-0 left-0 animate-scan"></div>
            </div>

            <div className="flex flex-col md:flex-row relative z-10">
              {/* Left Column: Transaction Summary */}
              <div className="md:w-1/2 p-8 sm:p-12 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/5">
                <header className="mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-500/5 border border-cyan-500/10 dark:border-cyan-500/20 mb-4">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Secure_Node_v2.4</span>
                  </div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none italic">
                    CHECKOUT
                  </h1>
                </header>

                <div className="space-y-8">
                  <div>
                    <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 font-mono">Item_Description</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{payment.workshop.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-mono text-cyan-600/70 dark:text-cyan-500/70">{payment.workshop.room.room_code}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                        <span className="text-[10px] font-mono text-cyan-600/70 dark:text-cyan-500/70">{payment.workshop.room.building}</span>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 font-mono">Amount_Due</p>
                        <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter font-mono">
                          {formatPrice(payment.amount, payment.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 font-mono">Status</p>
                         <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest animate-pulse">PENDING_AUTH</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment Methods */}
              <div className="md:w-1/2 p-8 sm:p-12 flex flex-col bg-gray-50/50 dark:bg-black/20">
                <p className="text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 font-mono">Gateway_Selection</p>
                
                <div className="space-y-4 flex-1">
                  <div className="p-6 rounded-xl border-2 border-cyan-500/50 bg-cyan-500/5 cursor-pointer transition-all hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 group/item">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-sm">
                           <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                             <rect x="2" y="5" width="20" height="14" rx="2" />
                             <line x1="2" y1="10" x2="22" y2="10" />
                           </svg>
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Mock_Neural_Card</p>
                          <p className="text-[8px] text-cyan-600/50 dark:text-cyan-500/50 uppercase tracking-widest mt-0.5 font-mono">Linked_to_wallet_0x71...82</p>
                        </div>
                      </div>
                      <div className="w-4 h-4 rounded-full border border-cyan-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 p-4 rounded-lg bg-rose-500/5 border border-rose-500/10 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 text-[9px] font-black uppercase tracking-widest flex flex-col gap-3 font-mono">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      ERROR: {error}
                    </div>
                    {error.includes('expired') || error.includes('not found') ? (
                      <Link to="/" className="text-cyan-500 hover:underline decoration-cyan-500/30">
                        &gt; RESTART_REGISTRATION_FLOW
                      </Link>
                    ) : null}
                  </div>
                )}

                <div className="mt-10">
                  <Form method="post">
                    <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
                    <button
                      type="submit"
                      disabled={isSubmitting || timeLeft <= 0}
                      className="w-full relative group/btn active:scale-[0.98] transition-all duration-200"
                    >
                      <div className={`relative flex items-center justify-center py-5 px-10 bg-gray-900 dark:bg-cyan-500 text-white dark:text-black rounded-xl font-black uppercase tracking-[0.4em] text-[12px] transition-all duration-300 ${isSubmitting || timeLeft <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-black dark:hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]'}`}>
                        <span className="relative z-10 flex items-center gap-3">
                          {isSubmitting ? 'UPLOADING_HASH...' : (timeLeft > 0 ? 'EXECUTE_PAYMENT' : 'AUTH_TIMEOUT')}
                        </span>
                      </div>
                    </button>
                  </Form>
                  <p className="text-[7px] text-center text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] mt-6 font-mono">
                    UNHUB_PROTOCOL_V2.4 // ENCRYPTION_AES_256_GCM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes grid-flow {
          0% { background-position: 0 0; }
          100% { background-position: 60px 60px; }
        }
        @keyframes scan {
          0% { top: -120px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(20px); }
          75% { transform: translateY(10px) translateX(-10px); }
        }
        .animate-grid-flow {
          animation: grid-flow 5s linear infinite;
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}} />
    </div>
  );
}



