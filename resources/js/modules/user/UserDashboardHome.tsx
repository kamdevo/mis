// modules/user/UserDashboardHome.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDashboardLayout } from '@/components/layouts/UserDashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/providers/AuthContext';
import { dashboardService, UserDashboardStats } from '@/lib/dashboardService';
import StatCard from '@/components/dashboard/StatCard';
import ChartCard from '@/components/dashboard/ChartCard';
import ActivityList from '@/components/dashboard/ActivityList';
import QuickActionCard from '@/components/dashboard/QuickActionCard';
import { 
  FileText, 
  TrendingUp, 
  Plus, 
  Eye,
  Loader2,
  BarChart3,
  FolderOpen
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const UserDashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getUserDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="user">
        <UserDashboardLayout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando dashboard...</p>
            </div>
          </div>
        </UserDashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !stats) {
    return (
      <ProtectedRoute requiredRole="user">
        <UserDashboardLayout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600">{error || 'Error al cargar datos'}</p>
              <button
                onClick={loadDashboardData}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Reintentar
              </button>
            </div>
          </div>
        </UserDashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="user">
      <UserDashboardLayout>
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl shadow-lg p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">
              ¡Hola, {user?.nombre || 'Usuario'}! 👋
            </h1>
            <p className="text-blue-100">
              Bienvenido a tu dashboard personal. Aquí puedes ver tus documentos y actividad reciente.
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <StatCard
              title="Documentos Disponibles"
              value={stats.availableDocuments}
              icon={FolderOpen}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Registros Esta Semana"
              value={stats.recentRecordsCount}
              icon={TrendingUp}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
          </div>

          {/* Charts and Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Actividad de Hoy
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Registros Creados</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.recentRecordsCount}</p>
                  </div>
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Documentos Disponibles</p>
                    <p className="text-2xl font-bold text-green-600">{stats.availableDocuments}</p>
                  </div>
                  <FolderOpen className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="lg:col-span-2">
              <ChartCard
                title="Actividad Reciente"
                subtitle="Registros creados en los últimos 7 días"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                  <BarChart data={stats.recordsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>

          {/* My Documents Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Mis Documentos
            </h3>
            {stats.myDocuments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No tienes documentos asignados todavía
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.myDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/dashboard-users/documents/${doc.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {doc.description || 'Sin descripción'}
                    </p>
                    <div className="flex items-center space-x-2">
                      {doc.can_create && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard-users/documents/${doc.id}/new`);
                          }}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Crear</span>
                        </button>
                      )}
                      {doc.can_edit && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Editar
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuickActionCard
              title="Ver Documentos"
              description="Explora todos tus documentos disponibles"
              icon={FolderOpen}
              onClick={() => navigate('/dashboard-users/documents')}
              color="blue"
            />
            <QuickActionCard
              title="Mis Registros"
              description="Revisa tus formularios completados"
              icon={BarChart3}
              onClick={() => navigate('/dashboard-users/documents')}
              color="purple"
            />
          </div>
        </div>
      </UserDashboardLayout>
    </ProtectedRoute>
  );
};
