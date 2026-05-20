import React, { useState } from 'react';
import { useAuth } from '../../providers/AuthContext';
import UserMenu from './UserMenu';
import { ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentSection: string;
}

const Header: React.FC<HeaderProps> = ({ currentSection }) => {
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
      <div className="h-1 w-full bg-[#1e2b66]" />
      <div className="flex h-16 items-center justify-between px-4 lg:h-20 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-3">
          <div className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#1e2b66] text-xs font-bold text-white shadow-sm sm:grid">
            MIS
          </div>
          <div className="min-w-0">
            <p className="hidden text-xs font-medium text-slate-500 sm:block">Banco de Sangre HUV</p>
            <h2 className="truncate text-lg font-semibold text-slate-950 lg:text-xl">{currentSection}</h2>
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/15"
            aria-label="Menú de usuario"
            type="button"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1e2b66] text-sm font-semibold text-white">
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
