import { createContext, useContext, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types (JSDoc — keeps it light without TypeScript)
// ---------------------------------------------------------------------------

/**
 * @typedef {'university' | 'dark'} Theme
 *
 * @typedef {Object} ThemeContextValue
 * @property {Theme}            theme       - The active theme name.
 * @property {boolean}          isDark      - Convenience flag for dark checks.
 * @property {() => void}       toggleTheme - Flip between university ↔ dark.
 * @property {(t: Theme) => void} setTheme  - Set a specific theme directly.
 */

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/** @type {React.Context<ThemeContextValue>} */
const ThemeContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * ThemeProvider — wraps the app and owns theme state.
 *
 * It persists the chosen theme in localStorage so the user's preference
 * survives a page refresh.  On mount it also applies the matching CSS class
 * to <html> so Tailwind's `dark:` variants and the global html rules in
 * index.css both react correctly.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // Rehydrate from localStorage, fall back to 'university'.
    return /** @type {Theme} */ (localStorage.getItem('unihub-theme')) || 'university';
  });

  // Keep <html> class in sync whenever theme changes.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('unihub-theme', theme);
  }, [theme]);

  /** Persist + update state. */
  const setTheme = (/** @type {Theme} */ newTheme) => {
    setThemeState(newTheme);
  };

  /** One-call toggle for a simple light/dark switch button. */
  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'university' ? 'dark' : 'university'));
  };

  const value = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useTheme — consume the theme context anywhere in the tree.
 *
 * Throws if called outside <ThemeProvider> so misconfigured component trees
 * surface a clear error instead of a silent null crash.
 *
 * @returns {ThemeContextValue}
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
}
