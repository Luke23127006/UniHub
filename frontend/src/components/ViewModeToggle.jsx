/** @typedef {'card'|'list'|'compact'} ViewMode */

const MODES = [
  {
    key: 'card',
    label: 'Card',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: 'list',
    label: 'List',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
  },
  {
    key: 'compact',
    label: 'Compact',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <line x1="3" y1="5" x2="21" y2="5" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="13" x2="21" y2="13" />
        <line x1="3" y1="17" x2="21" y2="17" />
        <line x1="3" y1="21" x2="21" y2="21" />
      </svg>
    ),
  },
];

/**
 * @param {{ viewMode: ViewMode, onChangeMode: (mode: ViewMode) => void }} props
 */
export default function ViewModeToggle({ viewMode, onChangeMode }) {
  return (
    <div
      className="flex items-center gap-0.5 bg-unihub-border/40 dark:bg-gray-700 rounded-lg p-1"
      role="group"
      aria-label="View mode"
    >
      {MODES.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChangeMode(key)}
          aria-label={`${label} view`}
          aria-pressed={viewMode === key}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
            ${
              viewMode === key
                ? 'bg-unihub-primary text-white shadow-sm'
                : 'text-unihub-muted dark:text-gray-400 hover:text-unihub-text dark:hover:text-gray-200'
            }
          `}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
