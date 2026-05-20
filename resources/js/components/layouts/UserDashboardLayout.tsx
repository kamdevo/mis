import React from 'react';
import Header from '../shared/Header';
import { useLocation } from 'react-router-dom';
import { Home, FileText, CheckSquare } from 'lucide-react';
import FloatingNavigationIsland, { FloatingNavigationItem } from '../ui/FloatingNavigationIsland';

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
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (href: string) => {
    if (href === '/dashboard-users') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const currentSection = menuItems.find(item => isActive(item.href))?.name || 'Inicio';
  const computedMenu: FloatingNavigationItem[] = menuItems.map((item) => ({ ...item, active: isActive(item.href) }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen flex-col">
        <Header currentSection={currentSection} />
        <main className="flex-1 overflow-y-auto p-4 pb-32 lg:p-8 lg:pb-36">
            {children}
        </main>
      </div>
      <FloatingNavigationIsland items={computedMenu} currentSection={currentSection} />
    </div>
  );
};
