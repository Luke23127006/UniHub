import { useState } from 'react';

const STORAGE_KEY = 'unihub-workshop-view';

/** @typedef {'card'|'list'|'compact'} ViewMode */

/**
 * Persists the user's chosen view mode in localStorage so it survives
 * a page refresh.
 *
 * @param {ViewMode} defaultMode
 * @returns {{ viewMode: ViewMode, setViewMode: (mode: ViewMode) => void }}
 */
export function useViewMode(defaultMode = 'card') {
  const [viewMode, setViewModeState] = useState(
    () => /** @type {ViewMode} */ (localStorage.getItem(STORAGE_KEY)) || defaultMode,
  );

  const setViewMode = (mode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  return { viewMode, setViewMode };
}
