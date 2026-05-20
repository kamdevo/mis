import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../shared/Header';
import { Home, Users, FileText, Activity } from 'lucide-react';
import { useAuth } from '@/providers/AuthContext';
import AppSidebar, { SidebarMenuItem } from '../shared/AppSidebar';

interface MenuItem {
  id: string;
  name: string;
  href: string;
  icon: React.ReactElement;
  active?: boolean;
  requiredRole?: string;
}

const getMenuItems = (userRole?: string): MenuItem[] => {
  const basePrefix = userRole === 'super-admin' ? '/dashboard-superadmin' : '/dashboard-admin';
  
  return [
    {
      id: 'inicio',
      name: 'Inicio',
      href: basePrefix,
      icon: <Home className="w-6 h-6" />,
    },
    {
      id: 'usuarios',
      name: 'Usuarios',
      href: `${basePrefix}/users`,
      icon: <Users className="w-6 h-6" />,
    },
    {
      id: 'documents',
      name: 'Documentos',
      href: `${basePrefix}/documents`,
      icon: <FileText className="w-6 h-6" />,
    },
    {
      id: 'activity',
      name: 'Actividad',
      href: `${basePrefix}/activity`,
      icon: <Activity className="w-6 h-6" />,
      requiredRole: 'super-admin'
    },
  ];
};

const normalize = (s: string) => (s !== '/' ? s.replace(/\/+$/, '') : '/');

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const pathname = normalize(location.pathname || '/');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleMenuItems = useMemo(() => {
    const items = getMenuItems(user?.rol);
    return items.filter(item => 
      !item.requiredRole || item.requiredRole === user?.rol
    );
  }, [user]);

  const rootHref = useMemo(
    () => normalize(visibleMenuItems.length > 0 ? visibleMenuItems.reduce((a, b) => (a.href.length <= b.href.length ? a : b)).href : '/dashboard-admin'),
    [visibleMenuItems]
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    const h = normalize(href);
    if (h === rootHref) return pathname === rootHref;
    return pathname === h || pathname.startsWith(h + '/');
  };

  const computedMenu = useMemo<SidebarMenuItem[]>(
    () => visibleMenuItems.map((item) => ({ ...item, active: isActive(item.href) })),
    [pathname, visibleMenuItems]
  );

  const currentSection = computedMenu.find((m) => m.active)?.name ?? 'Inicio';

  return (
    <div className="min-h-screen bg-slate-50 lg:pl-72">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar
        isOpen={sidebarOpen}
        items={computedMenu}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen flex-col">
        <Header
          currentSection={currentSection}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
