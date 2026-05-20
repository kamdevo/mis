import React, { useRef, useEffect } from 'react';
import { User } from '../../lib/auth';
import { LogOut } from 'lucide-react';

interface UserMenuProps {
  user: User | null;
  onClose: () => void;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onClose, onLogout }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!user) return null;

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    'super-admin': 'Super Admin',
    user: 'Usuario',
    editor: 'Editor',
  };

  return (
    <div 
      ref={menuRef}
      className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{user.nombre}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{user.correo}</p>
          </div>
          <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-100">
            {roleLabels[user.rol] || 'Usuario'}
          </span>
        </div>
      </div>

      <div className="p-2 border-t border-gray-100">
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default UserMenu;
