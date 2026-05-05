import { useMemo, useState } from 'react';
import { useViewMode } from '@/hooks/useViewMode';
import ViewModeToggle from '@/components/ViewModeToggle';
import WorkshopCardView from './components/WorkshopCardView';
import WorkshopListView from './components/WorkshopListView';
import WorkshopCompactView from './components/WorkshopCompactView';
import { MOCK_WORKSHOPS } from './data/mockWorkshops';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'draft', label: 'Draft' },
];

const TYPE_FILTERS = [
  { value: 'all', label: 'All types' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

const VIEW_COMPONENTS = {
  card: WorkshopCardView,
  list: WorkshopListView,
  compact: WorkshopCompactView,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-unihub-card dark:bg-gray-800 border border-unihub-border dark:border-gray-700 rounded-xl px-5 py-4">
      <p className="text-xs font-medium text-unihub-muted dark:text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkshopDashboard() {
  const { viewMode, setViewMode } = useViewMode('card');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Derived stats from the full (unfiltered) dataset
  const stats = useMemo(() => {
    const published = MOCK_WORKSHOPS.filter((w) => w.status === 'published');
    return {
      total: MOCK_WORKSHOPS.length,
      published: published.length,
      totalSeats: published.reduce((acc, w) => acc + w.available_seats, 0),
      paid: MOCK_WORKSHOPS.filter((w) => w.is_paid).length,
    };
  }, []);

  // Filtered list recomputed whenever any filter changes
  const filtered = useMemo(() => {
    return MOCK_WORKSHOPS.filter((w) => {
      const matchesSearch =
        !search ||
        w.title.toLowerCase().includes(search.toLowerCase()) ||
        w.speakers.some((s) => s.full_name.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || w.status === statusFilter;

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'free' && !w.is_paid) ||
        (typeFilter === 'paid' && w.is_paid);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, typeFilter]);

  const ActiveView = VIEW_COMPONENTS[viewMode];

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-unihub-text dark:text-gray-100">
          Workshop Dashboard
        </h1>
        <p className="mt-1 text-sm text-unihub-muted dark:text-gray-400">
          Browse, filter, and register for upcoming university workshops.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total workshops"
          value={stats.total}
          accent="text-unihub-primary dark:text-unihub-gold"
        />
        <StatCard
          label="Open for registration"
          value={stats.published}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          label="Available seats"
          value={stats.totalSeats}
          accent="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Paid workshops"
          value={stats.paid}
          accent="text-yellow-600 dark:text-yellow-400"
        />
      </div>

      {/* ── Filter & view toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-unihub-muted dark:text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search workshops or speakers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-unihub-border dark:border-gray-600 bg-unihub-card dark:bg-gray-800 text-unihub-text dark:text-gray-100 placeholder-unihub-muted dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-unihub-primary/40 dark:focus:ring-unihub-primary/60"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="shrink-0 px-3 py-2 text-sm rounded-lg border border-unihub-border dark:border-gray-600 bg-unihub-card dark:bg-gray-800 text-unihub-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-unihub-primary/40"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="shrink-0 px-3 py-2 text-sm rounded-lg border border-unihub-border dark:border-gray-600 bg-unihub-card dark:bg-gray-800 text-unihub-text dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-unihub-primary/40"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* View mode toggle */}
        <ViewModeToggle viewMode={viewMode} onChangeMode={setViewMode} />
      </div>

      {/* ── Result count ── */}
      <p className="text-xs text-unihub-muted dark:text-gray-500">
        Showing <span className="font-semibold text-unihub-text dark:text-gray-300">{filtered.length}</span> of {MOCK_WORKSHOPS.length} workshops
      </p>

      {/* ── Active view ── */}
      <ActiveView workshops={filtered} />
    </div>
  );
}
