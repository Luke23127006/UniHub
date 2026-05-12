import { ThemeProvider } from '@/context/ThemeContext';

export function AppProviders({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
