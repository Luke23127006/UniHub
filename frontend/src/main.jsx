import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/context/ThemeContext';
import App from './App';
import './index.css';

// ThemeProvider sits at the very root so every component in the tree
// can call useTheme() without any further setup.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
