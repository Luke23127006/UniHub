import { useState } from 'react';
import { Link, useLoaderData, useNavigate, Form, useNavigation, useActionData, redirect } from 'react-router';
import { workshopApi } from '@/features/workshop/api';
import { ticketApi } from '../api';
import StatusBadge from '@/components/StatusBadge';

export async function loader({ params }) {
  const workshop = await workshopApi.getById(params.id);
  return { workshop };
}

export async function action({ params, request }) {
  const formData = await request.formData();
  const idempotencyKey = formData.get('idempotencyKey');

  try {
    const result = await ticketApi.register(params.id, idempotencyKey);
    
    if (result.requires_payment) {
      return redirect(`/checkout/${result.payment_id}`);
    } else {
      return redirect(`/my-tickets/${result.id}`);
    }
  } catch (err) {
    console.error('Registration failed', err);
    return { error: 'Registration failed. Please try again later.' };
  }
}

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

export default function RegistrationPage() {
  const { workshop } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const error = actionData?.error;

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-12 px-4 sm:px-6 bg-gray-50/20 dark:bg-transparent flex items-center justify-center">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="max-w-4xl w-full relative z-10">
        
        {/* Compact Back Button */}
        <Link to={`/workshops/${workshop.id}`} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-cyan-500 transition-colors mb-6 group">
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Cancel
        </Link>

        {/* Split Layout Card */}
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden relative">
          
          {/* Border Beam Animation */}
          <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
            <div className="absolute inset-[-150%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(34,211,238,0.3)_360deg)]"></div>
          </div>

          <div className="flex flex-col md:flex-row relative z-10">
            
            {/* Left Column: Workshop Summary */}
            <div className="md:w-2/5 p-8 sm:p-10 bg-gray-50/50 dark:bg-gray-800/50 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 flex flex-col">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Review Entry</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tighter">
                  Workshop Details
                </h2>
              </div>

              <div className="space-y-6 flex-1">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 font-mono">Title</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{workshop.title}</p>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Schedule</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{formatDateTime(workshop.start_time)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Venue</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {workshop.room?.room_code}
                      <span className="block text-[9px] text-gray-500 font-normal mt-0.5">{workshop.room?.building}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Fee</span>
                  <span className="text-xl font-black text-gray-900 dark:text-white">{formatPrice(workshop.price, workshop.currency)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Confirmation */}
            <div className="md:w-3/5 p-8 sm:p-12 flex flex-col justify-center">
              <header className="mb-10 text-center md:text-left">
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                  Confirm Registration
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-4 leading-relaxed">
                  Please verify the information on the left before finalizing your registration.
                </p>
              </header>

              <div className="space-y-8">
                {/* Simplified Status */}
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-800 shadow-sm">
                    <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Official Registration</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">Verified by UniHub</p>
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {error}
                  </div>
                )}

                <Form method="post">
                  <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
                  <button
                    type="submit"
                    disabled={isSubmitting || workshop.available_seats <= 0}
                    className="w-full relative group active:scale-[0.98] transition-all duration-200"
                  >
                    <div className={`relative flex items-center justify-center py-5 px-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] transition-all duration-300 ${isSubmitting ? 'opacity-80' : 'hover:shadow-2xl shadow-gray-200 dark:shadow-none'}`}>
                      <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-black/5 to-transparent"></div>
                      
                      <span className="relative z-10 flex items-center gap-3">
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Finalizing...
                          </>
                        ) : (
                          workshop.available_seats > 0 ? 'Complete Registration' : 'Workshop Full'
                        )}
                      </span>
                    </div>
                  </button>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
