import { Link, NavLink } from 'react-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, LayoutGrid, Ticket, User } from 'lucide-react';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();

  return (
    <header className="bg-unihub-primary dark:bg-gray-900 border-b border-unihub-border dark:border-gray-700 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap size={28} className="text-unihub-gold" strokeWidth={2.5} />
          <span className="text-unihub-gold font-bold text-xl tracking-wide">
            UniHub
          </span>
          <span className="hidden sm:inline text-unihub-bg/70 dark:text-gray-400 text-sm">
            Workshop Portal
          </span>
        </Link>

        {/* Navigation links */}
        <ul className="hidden md:flex items-center gap-6">
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? 'text-unihub-gold' : 'text-unihub-bg/80 dark:text-gray-300 hover:text-unihub-gold'
                }`
              }
            >
              <LayoutGrid size={18} />
              Workshops
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/my-tickets"
              className={({ isActive }) =>
                `flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? 'text-unihub-gold' : 'text-unihub-bg/80 dark:text-gray-300 hover:text-unihub-gold'
                }`
              }
            >
              <Ticket size={18} />
              My Registrations
            </NavLink>
          </li>
          {user?.role === "Admin" && (
            <li>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-unihub-gold"
                      : "text-unihub-bg/80 dark:text-gray-300 hover:text-unihub-gold"
                  }`
                }
              >
                <LayoutGrid size={18} className="text-unihub-gold" />
                Admin Panel
              </NavLink>
            </li>
          )}
        </ul>

        {/* Right side: theme toggle + auth action */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-full text-unihub-bg/70 dark:text-gray-400 hover:text-unihub-gold dark:hover:text-white hover:bg-white/10 transition-colors"
          >
            {theme === 'university' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4a1 1 0 011-1V2a1 1 0 10-2 0v1a1 1 0 011 1zm0 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4 12a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm16 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zM6.34 6.34a1 1 0 010-1.42l-.71-.7a1 1 0 10-1.41 1.41l.7.71a1 1 0 001.42 0zm12.73 12.73a1 1 0 010-1.41l.71-.71a1 1 0 10-1.41-1.41l-.71.71a1 1 0 000 1.41 1 1 0 001.41 0zM6.34 17.66a1 1 0 00-1.42 0l-.7.71a1 1 0 101.41 1.41l.71-.71a1 1 0 000-1.41zM19.07 4.93a1 1 0 00-1.41 0l-.71.7a1 1 0 001.41 1.42l.71-.71a1 1 0 000-1.41zM12 7a5 5 0 100 10A5 5 0 0012 7z" />
              </svg>
            )}
          </button>

          {/* Auth Button/Avatar */}
          {isAuthenticated ? (
            <Link 
              to="/profile" 
              className="w-10 h-10 rounded-full bg-unihub-gold flex items-center justify-center text-unihub-bg hover:scale-105 transition-transform"
              title="View Profile"
            >
              <User size={22} strokeWidth={2.5} />
            </Link>
          ) : (
            <Link 
              to="/login" 
              className="bg-unihub-gold text-unihub-text hover:bg-yellow-400 dark:hover:bg-yellow-300 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
