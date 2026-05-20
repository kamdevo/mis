// modules/admin/DashboardHome.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/providers/AuthContext';
import { dashboardService, AdminDashboardStats } from '@/lib/dashboardService';
import StatCard from '@/components/dashboard/StatCard';
import ChartCard from '@/components/dashboard/ChartCard';
import ActivityList from '@/components/dashboard/ActivityList';
import QuickActionCard from '@/components/dashboard/QuickActionCard';
import { 
  Users, 
  FileText, 
  Database, 
  TrendingUp,
  UserPlus,
  FilePlus,
  Activity,
  Loader2,
  Clock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';

export const DashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getAdminDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <DashboardLayout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Cargando dashboard...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !stats) {
    return (
      <ProtectedRoute requiredRole="admin">
        <DashboardLayout>
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
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl shadow-lg p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">
              Panel de Administración
            </h1>
            <p className="text-indigo-100">
              Vista general del sistema y estadísticas de actividad
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Usuarios"
              value={stats.totalUsers}
              icon={Users}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-100"
            />
            <StatCard
              title="Total Documentos"
              value={stats.totalDocuments}
              icon={FileText}
              iconColor="text-green-600"
              iconBgColor="bg-green-100"
            />
            <StatCard
              title="Total Registros"
              value={stats.totalRecords}
              icon={Database}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-100"
            />
            <StatCard
              title="Activos Hoy"
              value={stats.formsActiveToday}
              icon={TrendingUp}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Registros Creados"
              subtitle="Últimos 30 días"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                <LineChart data={stats.recordsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Registros"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Registros por Documento"
              subtitle="Top 5 documentos más usados"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                <BarChart data={stats.recordsByDocument}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Pending Forms Today */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-orange-600" />
              Formularios de Hoy
            </h3>
            {stats.pendingForms.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay actividad registrada hoy
              </p>
            ) : (
              <div className="space-y-3">
                {stats.pendingForms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-orange-100 text-orange-600 p-2 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{form.description}</p>
                        <p className="text-sm text-gray-600">Por: {form.user}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{form.created_at}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <QuickActionCard
              title="Crear Usuario"
              description="Agregar nuevo usuario al sistema"
              icon={UserPlus}
              onClick={() => navigate('/dashboard-admin/users')}
              color="blue"
            />
            <QuickActionCard
              title="Crear Documento"
              description="Crear un nuevo formulario dinámico"
              icon={FilePlus}
              onClick={() => navigate('/dashboard-admin/documents')}
              color="green"
            />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
