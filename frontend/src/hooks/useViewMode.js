import { useState } from 'react';

const STORAGE_KEY = 'unihub-workshop-view';

/** @typedef {'card'|'list'|'compact'} ViewMode */

/** Exhaustive list — used to validate anything read from localStorage. */
const VALID_MODES = /** @type {const} */ (['card', 'list', 'compact']);

/**
 * Read the stored mode and return it only when it is a known value.
 * An invalid or missing entry returns `defaultMode` and clears the stale key.
 *
 * @param {ViewMode} defaultMode
 * @returns {ViewMode}
 */
function readStoredMode(defaultMode) {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_MODES.includes(/** @type {ViewMode} */ (stored))) {
    return /** @type {ViewMode} */ (stored);
  }
  // Remove corrupted / outdated value so it doesn't linger.
  if (stored !== null) localStorage.removeItem(STORAGE_KEY);
  return defaultMode;
}

/**
 * Persists the user's chosen view mode in localStorage so it survives
 * a page refresh.
 *
 * @param {ViewMode} defaultMode
 * @returns {{ viewMode: ViewMode, setViewMode: (mode: ViewMode) => void }}
 */
export function useViewMode(defaultMode = 'card') {
  const [viewMode, setViewModeState] = useState(() => readStoredMode(defaultMode));

  const setViewMode = (/** @type {ViewMode} */ mode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  return { viewMode, setViewMode };
}
