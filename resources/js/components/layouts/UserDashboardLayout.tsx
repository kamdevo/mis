import React, { useState } from 'react';
import Header from '../shared/Header';
import { useLocation } from 'react-router-dom';
import { Home, FileText, CheckSquare } from 'lucide-react';
import { useAuth } from '@/providers/AuthContext';
import AppSidebar, { SidebarMenuItem } from '../shared/AppSidebar';

interface UserDashboardLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    id: 'inicio',
    name: 'Inicio',
    href: '/dashboard-users',
    icon: <Home className="w-6 h-6" />,
  },
  {
    id: 'hemocomponentes',
    name: 'Mis Documentos',
    href: '/dashboard-users/documents',
    icon: <FileText className="w-6 h-6" />,
  },
  {
      id: 'revisiones',
      name: 'Revisiones',
      href: '/dashboard-users/reviews',
      icon: <CheckSquare className="w-6 h-6" />,
  },
];

export const UserDashboardLayout: React.FC<UserDashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (href: string) => {
    if (href === '/dashboard-users') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const currentSection = menuItems.find(item => isActive(item.href))?.name || 'Inicio';
  const computedMenu: SidebarMenuItem[] = menuItems.map((item) => ({ ...item, active: isActive(item.href) }));

  return (
    <div className="min-h-screen bg-slate-50 lg:pl-72">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AppSidebar
        isOpen={sidebarOpen}
        items={computedMenu}
        user={user}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex min-h-screen flex-col">
        <Header
          currentSection={currentSection}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            {children}
        </main>
      </div>
    </div>
  );
};
