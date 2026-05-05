/** Maps each WorkshopStatus to its display label + Tailwind classes. */
const STATUS_MAP = {
  published: {
    label: 'Published',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  },
};

/**
 * @param {{ status: string, className?: string }} props
 */
export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_MAP[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
