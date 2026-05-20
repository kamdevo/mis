// modules/superadmin/SuperAdminDashboardHome.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/providers/AuthContext';
import { dashboardService, SuperAdminDashboardStats } from '@/lib/dashboardService';
import StatCard from '@/components/dashboard/StatCard';
import ChartCard from '@/components/dashboard/ChartCard';
import ActivityList from '@/components/dashboard/ActivityList';
import QuickActionCard from '@/components/dashboard/QuickActionCard';
import { 
  Users, 
  FileText, 
  Database, 
  Activity,
  TrendingUp,
  PieChart as PieChartIcon,
  Loader2,
  Shield,
  BarChart3
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const SuperAdminDashboardHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SuperAdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getSuperAdminDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="super-admin">
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
      <ProtectedRoute requiredRole="super-admin">
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
    <ProtectedRoute requiredRole="super-admin">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center space-x-3 mb-2">
              <Shield className="w-8 h-8" />
              <h1 className="text-3xl font-bold">
                Super Admin Dashboard
              </h1>
            </div>
            <p className="text-purple-100">
              Vista completa del sistema con métricas avanzadas y análisis de uso
            </p>
          </div>

          {/* System Metrics */}
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
              title="Total Actividades"
              value={stats.totalActivities}
              icon={Activity}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-100"
            />
          </div>

          {/* Main Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Distribution by Role */}
            <ChartCard
              title="Distribución de Usuarios"
              subtitle="Por rol en el sistema"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                <PieChart>
                  <Pie
                    data={stats.usersByRole}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => 
                      `${entry.role}: ${entry.count} (${((entry.percent || 0) * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.usersByRole.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Most Active Documents */}
            <ChartCard
              title="Documentos Más Activos"
              subtitle="Top 5 por cantidad de registros"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                <BarChart data={stats.mostActiveDocuments} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Trends Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Activity Trend */}
            <ChartCard
              title="Actividad de Usuarios"
              subtitle="Últimos 7 días"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                <LineChart data={stats.userActivityPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Actividades"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Document Creation Trend */}
            <ChartCard
              title="Documentos Creados"
              subtitle="Últimos 30 días"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                <BarChart data={stats.documentCreationTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickActionCard
              title="Gestión de Usuarios"
              description="Administrar todos los usuarios del sistema"
              icon={Users}
              onClick={() => navigate('/dashboard-superadmin/users')}
              color="blue"
            />
            <QuickActionCard
              title="Gestión de Documentos"
              description="Ver y administrar todos los documentos"
              icon={FileText}
              onClick={() => navigate('/dashboard-superadmin/documents')}
              color="green"
            />
            <QuickActionCard
              title="Log de Actividad"
              description="Revisar actividad completa del sistema"
              icon={Activity}
              onClick={() => navigate('/dashboard-superadmin/activity')}
              color="purple"
            />
          </div>

          {/* Activity Log Preview */}
          <ActivityList
            activities={stats.activityLogPreview}
            title="Log de Actividad del Sistema"
            showUser={true}
          />

          {/* System Health Indicator */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Estado del Sistema</h3>
                <p className="text-gray-600">Todos los servicios operando normalmente</p>
              </div>
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center space-x-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span>Operacional</span>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};
