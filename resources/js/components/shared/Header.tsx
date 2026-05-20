import React, { useState } from 'react';
import { useAuth } from '../../providers/AuthContext';
import UserMenu from './UserMenu';
import { Menu, ChevronDown, X } from 'lucide-react';

interface HeaderProps {
  currentSection: string;
  onMenuToggle: () => void;
  sidebarOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ currentSection, onMenuToggle, sidebarOpen = false }) => {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-[60] border-b border-slate-200 bg-white/95 text-slate-950 shadow-sm backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 lg:h-20 lg:px-8">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 active:bg-slate-200 lg:hidden"
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
          type="button"
        >
          {sidebarOpen ? (
            <X className="h-6 w-6" strokeWidth={2.4} />
          ) : (
            <Menu className="h-6 w-6" strokeWidth={2.4} />
          )}
        </button>

        <div className="min-w-0 flex-1 px-3 lg:px-0">
          <h2 className="truncate text-lg font-semibold text-slate-950 lg:text-xl">{currentSection}</h2>
        </div>

        <div className="relative flex items-center gap-3">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-red-100"
            aria-label="Menú de usuario"
            type="button"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-700 text-sm font-semibold text-white">
              {user ? getInitials(user.nombre) : 'U'}
            </div>
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">Cuenta</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isUserMenuOpen && (
            <UserMenu
              user={user}
              onClose={() => setIsUserMenuOpen(false)}
              onLogout={logout}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
