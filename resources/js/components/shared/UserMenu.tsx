import React, { useRef, useEffect } from 'react';
import { User } from '../../lib/auth';
import { motion, Transition } from 'motion/react';
import { LogOut } from 'lucide-react';

interface UserMenuProps {
  user: User | null;
  onClose: () => void;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onClose, onLogout }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const menuTransition: Transition = {
    type: 'tween',
    ease: [0.22, 1, 0.36, 1],
    duration: 0.22,
  };

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
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, y: -8, scale: 0.96, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -8, scale: 0.96, filter: 'blur(4px)' }}
      transition={menuTransition}
      className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
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
    </motion.div>
  );
};

export default UserMenu;
