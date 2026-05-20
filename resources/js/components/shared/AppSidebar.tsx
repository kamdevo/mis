import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { User } from '@/lib/auth';

export interface SidebarMenuItem {
  id: string;
  name: string;
  href: string;
  icon: React.ReactElement;
  active?: boolean;
}

interface AppSidebarProps {
  isOpen: boolean;
  items: SidebarMenuItem[];
  user: User | null;
  onClose: () => void;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  'super-admin': 'Super Admin',
  user: 'Usuario',
  editor: 'Editor',
};

const renderIcon = (icon: React.ReactElement, active?: boolean) => (
  <span
    className={clsx(
      'grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors',
      active ? 'bg-red-700 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
    )}
  >
    {React.cloneElement(icon, {
      className: clsx('h-5 w-5', icon.props.className),
      strokeWidth: 2.1,
    })}
  </span>
);

const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, items, user, onClose }) => {
  const roleLabel = user?.rol ? roleLabels[user.rol] || 'Usuario' : 'Usuario';

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col border-r border-slate-200 bg-white shadow-2xl shadow-slate-900/10 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
      aria-label="Barra lateral"
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 lg:h-20">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <img src="/logo-hospital.png" alt="Logo del Hospital" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">MIS Banco de Sangre</p>
            <p className="truncate text-xs text-slate-500">Hospital Universitario del Valle</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:hidden"
          aria-label="Cerrar menú"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-slate-200 px-4 py-4">
        <div className="rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
          <p className="truncate text-sm font-semibold text-slate-900">{user?.nombre || 'Usuario'}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="truncate text-xs text-slate-500">{user?.correo || 'Sesión activa'}</p>
            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-100">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegación principal">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Navegación</p>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href}
                onClick={onClose}
                aria-current={item.active ? 'page' : undefined}
                className={clsx(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-red-200',
                  item.active ? 'bg-red-50 text-red-800 ring-1 ring-red-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                )}
              >
                {item.active && <span className="absolute left-0 h-7 w-1 rounded-r-full bg-red-700" />}
                {renderIcon(item.icon, item.active)}
                <span className="truncate">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <div className="rounded-lg bg-slate-950 px-3 py-3 text-white">
          <p className="text-xs font-semibold">MIS - HUV</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">Gestión documental y trazabilidad operativa.</p>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;