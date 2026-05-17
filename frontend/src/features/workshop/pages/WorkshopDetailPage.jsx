import { Link, useLoaderData } from 'react-router';
import StatusBadge from '@/components/StatusBadge';
import { workshopApi } from '../api';

export async function loader({ params }) {
  return workshopApi.getById(params.id);
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

// Minimalist Icons with Accents
const ClockIcon = () => (
  <svg className="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const MapIcon = () => (
  <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const UsersIcon = () => (
  <svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
  </svg>
);
const TagIcon = () => (
  <svg className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);
const UserCircleIcon = () => (
  <svg className="w-6 h-6 text-cyan-500 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function WorkshopDetailPage() {
  const workshop = useLoaderData();
  const summaryText = workshop.ai_summaries?.[0]?.summary_text;
  const sentences = summaryText ? summaryText.split(/[.!?]\s+/).filter(Boolean) : [];
  const introText = sentences.slice(0, 2).join('. ') + (sentences.length > 0 ? '.' : '');
  const bulletPoints = sentences.slice(2);
  const seatsAvailable = workshop.available_seats || 0;
  const capacity = workshop.capacity || 1;
  const occupancyPercentage = Math.min(100, Math.max(0, ((capacity - seatsAvailable) / capacity) * 100));

  return (
    <div className="relative min-h-[calc(100vh-8rem)] py-8 ">
      {/* Subtle Minimalist Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 space-y-10">
        
        {/* Navigation */}
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-cyan-500 transition-colors group">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          System / Catalog
        </Link>

        {/* Hero Section - Luxury Minimalist */}
        <section className="relative rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-3xl p-8 sm:p-12 overflow-hidden shadow-2xl shadow-gray-200/50 dark:shadow-none">
          
          {/* Border Beam Animation */}
          <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
            <div className="absolute inset-[-150%] animate-[spin_12s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,rgba(34,211,238,0.3)_360deg)]"></div>
          </div>

          <div className="relative flex flex-col md:flex-row gap-10 items-start justify-between">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-[1px] bg-cyan-500/50"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Research & Workshop</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white leading-[1.1] uppercase tracking-tighter">
                {workshop.title}
              </h1>
              <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 leading-relaxed font-medium max-w-2xl">
                {workshop.description}
              </p>
            </div>

            <div className="shrink-0 flex flex-col gap-6 items-end">
              <div className="px-4 py-1.5 rounded-full border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
                <StatusBadge status={workshop.status} />
              </div>
              
              <Link 
                to={`/workshops/${workshop.id}/register`}
                className={`relative group overflow-hidden ${seatsAvailable <= 0 ? 'pointer-events-none opacity-50' : ''}`}
              >
                <div className="relative flex items-center justify-center gap-4 py-4 px-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all duration-300 hover:shadow-2xl">
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-black/5 to-transparent"></div>
                  
                  {seatsAvailable > 0 ? (
                    <>
                      Initialize Access
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  ) : (
                    'Capacity Reached'
                  )}
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Info Grid - Clean Cards */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Time', value: formatDateTime(workshop.start_time), icon: <ClockIcon />, sub: 'Verification Window', bg: 'bg-cyan-500/5 dark:bg-cyan-500/10' },
            { label: 'Location', value: workshop.room?.room_code, icon: <MapIcon />, sub: workshop.room?.building, bg: 'bg-purple-500/5 dark:bg-purple-500/10' },
            { label: 'Capacity', value: `${seatsAvailable} / ${capacity}`, icon: <UsersIcon />, sub: 'Active Registry', progress: occupancyPercentage, bg: 'bg-emerald-500/5 dark:bg-emerald-500/10' },
            { label: 'Access Fee', value: formatPrice(workshop.price, workshop.currency), icon: <TagIcon />, sub: 'Authenticated', bg: 'bg-amber-500/5 dark:bg-amber-500/10' },
          ].map((item, i) => (
            <div key={i} className="bg-white/40 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 hover:border-gray-200 dark:hover:border-gray-700 transition-all group">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 group-hover:scale-110 transition-transform ${item.bg}`}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">{item.value}</p>
                </div>
              </div>
              {item.progress !== undefined && (
                <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${item.progress > 90 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              )}
              {item.sub && <p className="mt-3 text-[9px] font-mono text-gray-400 uppercase tracking-widest">{item.sub}</p>}
            </div>
          ))}
        </div>

        {/* AI Executive Summary - Premium Glassmorphic Card */}
        {summaryText && (
          <section className="relative overflow-hidden rounded-[2.5rem] border border-gray-100 dark:border-cyan-400/10 bg-gradient-to-br from-cyan-500/[0.02] via-white to-purple-500/[0.02] dark:from-gray-900/90 dark:to-black p-8 sm:p-10 shadow-xl dark:shadow-2xl">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[18rem] h-[18rem] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[8rem] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[18rem] h-[18rem] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[8rem] pointer-events-none"></div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <svg className="w-4 h-4 animate-[pulse_1.5s_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-900 dark:text-white">
                    AI Smart Insights
                  </h2>
                  <p className="text-[9px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                    Real-time synthesis & value extraction
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[9px] font-mono uppercase tracking-widest self-start sm:self-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-[ping_1.5s_infinite]"></span>
                Gemini-Flash Active
              </div>
            </div>

            {/* Content Layout: 2 Columns */}
            <div className="grid gap-8 lg:grid-cols-12 relative z-10">
              {/* Column 1: Core Overview (Left) - Span 7 */}
              <div className="lg:col-span-7 space-y-6">
                <div className="relative pl-6 sm:pl-8 border-l-2 border-cyan-500/50">
                  <span className="absolute left-0 top-0 -translate-x-[60%] -translate-y-[40%] text-6xl text-cyan-500/[0.04] dark:text-cyan-500/10 font-serif leading-none select-none">“</span>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block mb-2">Executive Overview</span>
                  <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed font-medium italic first-letter:text-3xl first-letter:font-black first-letter:text-cyan-600 dark:first-letter:text-cyan-400 first-letter:float-left first-letter:mr-2 first-letter:mt-1">
                    {introText}
                  </p>
                </div>
              </div>

              {/* Column 2: Highlights / Focus Areas (Right) - Span 5 */}
              <div className="lg:col-span-5 bg-gray-50/50 dark:bg-white/[0.01] border border-gray-100 dark:border-gray-800/80 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="text-purple-500 dark:text-purple-400">✦</span>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Key Takeaways & Agenda
                  </h3>
                </div>

                <div className="space-y-4">
                  {bulletPoints.map((point, index) => {
                    const cleanPoint = point.trim() + (point.endsWith('.') ? '' : '.');
                    return (
                      <div key={index} className="flex gap-3 group">
                        <div className="shrink-0 mt-1 h-4 w-4 rounded-full border border-cyan-500/30 flex items-center justify-center text-[8px] text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-500/5 group-hover:bg-cyan-500/20 group-hover:border-cyan-500 dark:group-hover:border-cyan-400 transition-colors">
                          0{index + 1}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          {cleanPoint}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Speakers - Simplified */}
        {workshop.speakers && workshop.speakers.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Authenticated Speakers</h2>
              <div className="flex-1 h-[1px] bg-gray-100 dark:bg-gray-800"></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workshop.speakers.map((speaker, index) => (
                <div key={index} className="flex items-center gap-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <div className="shrink-0 p-2 rounded-full border border-gray-100 dark:border-gray-800">
                    <UserCircleIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{speaker.full_name}</p>
                    <p className="text-[9px] text-gray-400 truncate mt-1 font-mono uppercase tracking-widest">
                      {speaker.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
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
