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

// Tech Icons (SVG inline)
const ClockIcon = () => (
  <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const MapIcon = () => (
  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const UsersIcon = () => (
  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const TagIcon = () => (
  <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);
const UserCircleIcon = () => (
  <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function WorkshopDetailPage() {
  const workshop = useLoaderData();
  const seatsAvailable = workshop.available_seats || 0;
  const capacity = workshop.capacity || 1;
  const occupancyPercentage = Math.min(100, Math.max(0, ((capacity - seatsAvailable) / capacity) * 100));

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Background Tech Pattern */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50 dark:opacity-100"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 space-y-8 pb-12">
        {/* Navigation */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          BACK TO DATABASE
        </Link>

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl border border-unihub-border dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-8 shadow-2xl shadow-cyan-500/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-transparent"></div>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-cyan-300 dark:to-purple-400">
                {workshop.title}
              </h1>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-gray-700 dark:text-gray-300 font-light">
                {workshop.description}
              </p>
            </div>
            <div className="shrink-0 mt-2 sm:mt-0">
              <div className="inline-block p-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20">
                <StatusBadge status={workshop.status} className="shadow-[0_0_15px_rgba(0,255,255,0.3)]" />
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Time Card */}
          <div className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-5 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/50 transition-colors">
                <ClockIcon />
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">Time</dt>
                <dd className="mt-1 text-sm font-medium font-mono text-gray-900 dark:text-cyan-50">{formatDateTime(workshop.start_time)}</dd>
              </div>
            </div>
          </div>

          {/* Room Card */}
          <div className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-5 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                <MapIcon />
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">Location</dt>
                <dd className="mt-1 text-sm font-medium font-mono text-gray-900 dark:text-purple-50">
                  {workshop.room?.room_code}
                  <span className="block text-xs text-gray-500 dark:text-gray-400 font-sans mt-0.5">{workshop.room?.building}</span>
                </dd>
              </div>
            </div>
          </div>

          {/* Seats Card */}
          <div className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-5 hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(74,222,128,0.15)] transition-all duration-300">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors">
                <UsersIcon />
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">Capacity</dt>
                <dd className="mt-1 text-sm font-medium font-mono text-gray-900 dark:text-green-50">
                  <span className={seatsAvailable > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
                    {seatsAvailable}
                  </span>
                  <span className="text-gray-400 mx-1">/</span>
                  {capacity}
                </dd>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${occupancyPercentage > 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'}`}
                style={{ width: `${occupancyPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Price Card */}
          <div className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-5 hover:border-yellow-500/50 hover:shadow-[0_0_20px_rgba(250,204,21,0.15)] transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/50 transition-colors">
                <TagIcon />
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wider uppercase text-gray-500 dark:text-gray-400">Access Fee</dt>
                <dd className="mt-1 text-lg font-bold font-mono text-gray-900 dark:text-yellow-400">
                  {formatPrice(workshop.price, workshop.currency)}
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Speakers Section */}
        {workshop.speakers && workshop.speakers.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-gray-500 dark:text-gray-400 mb-6 flex items-center gap-3">
              <span className="w-8 h-[1px] bg-cyan-500/50"></span>
              Verified Personnel
              <span className="flex-1 h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent"></span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workshop.speakers.map((speaker, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-xl border border-cyan-500/20 dark:border-cyan-500/30 bg-cyan-50/50 dark:bg-gray-900/60 backdrop-blur-md hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-300 group">
                  <div className="shrink-0 p-1.5 rounded-full border border-cyan-200 dark:border-cyan-800 bg-white dark:bg-gray-800 group-hover:shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-shadow">
                    <UserCircleIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{speaker.full_name}</p>
                    {(speaker.title || speaker.organization) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-mono">
                        {speaker.title} {speaker.title && speaker.organization && '•'} {speaker.organization}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
