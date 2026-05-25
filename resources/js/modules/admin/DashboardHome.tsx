import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/providers/AuthContext';
import { dashboardService, AdminDashboardStats } from '@/lib/dashboardService';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Database,
  FilePlus2,
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MetricTileProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: 'blue' | 'red' | 'slate';
}

interface ChartPanelProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  accent?: 'blue' | 'red';
}

const chartTooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.10)',
  color: '#0f172a',
};

const formatDateLabel = (date: string) => {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  });
};

const MetricTile: React.FC<MetricTileProps> = ({ label, value, icon: Icon, tone = 'blue' }) => {
  const toneClassName = {
    blue: 'bg-[#1e2b66]/10 text-[#1e2b66]',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-600',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const ChartPanel: React.FC<ChartPanelProps> = ({ title, subtitle, icon: Icon, children }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#1e2b66]">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <div className="h-80">{children}</div>
  </section>
);

const EmptyPanel: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
    <FileText className="h-8 w-8 text-slate-300" />
    <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
  </div>
);

const QuickAction: React.FC<QuickActionProps> = ({ title, description, icon: Icon, onClick, accent = 'blue' }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#1e2b66]/30 hover:bg-slate-50"
  >
    <div className="flex min-w-0 items-center gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent === 'red' ? 'bg-red-50 text-red-700' : 'bg-[#1e2b66]/10 text-[#1e2b66]'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 truncate text-sm text-slate-500">{description}</p>
      </div>
    </div>
    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#1e2b66]" />
  </button>
);

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
      setError('');
      const data = await dashboardService.getAdminDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const recentActivityCount = useMemo(
    () => stats?.recordsPerDay.reduce((total, day) => total + Number(day.count || 0), 0) ?? 0,
    [stats]
  );

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <DashboardLayout>
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="h-10 w-10 animate-spin text-[#1e2b66]" />
              <p className="text-sm font-medium">Cargando dashboard...</p>
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
          <div className="rounded-lg border border-red-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-lg font-semibold text-slate-950">Error al cargar</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{error || 'No se pudieron cargar los datos del dashboard.'}</p>
              <button
                type="button"
                onClick={loadDashboardData}
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e2b66] px-4 text-sm font-semibold text-white transition hover:bg-[#172252]"
              >
                <RefreshCw className="h-4 w-4" />
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
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Inicio</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-950">Panel de administración</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Vista operativa del sistema MIS para seguimiento de usuarios, documentos y registros del Banco de Sangre.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Sesión</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">{user?.nombre || 'Administrador'}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Usuarios" value={stats.totalUsers} icon={Users} />
            <MetricTile label="Documentos" value={stats.totalDocuments} icon={FileText} tone="slate" />
            <MetricTile label="Registros" value={stats.totalRecords} icon={Database} />
            <MetricTile label="Activos hoy" value={stats.formsActiveToday} icon={TrendingUp} tone="red" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <ChartPanel title="Registros creados" subtitle="Actividad de los últimos 30 días" icon={TrendingUp}>
              {stats.recordsPerDay.length === 0 ? (
                <EmptyPanel label="No hay registros recientes para graficar." />
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                  <LineChart data={stats.recordsPerDay} margin={{ top: 12, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatDateLabel} />
                    <Line type="monotone" dataKey="count" stroke="#1e2b66" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} name="Registros" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            <ChartPanel title="Registros por documento" subtitle="Documentos con más uso" icon={BarChart3}>
              {stats.recordsByDocument.length === 0 ? (
                <EmptyPanel label="Aún no hay documentos con registros." />
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                  <BarChart data={stats.recordsByDocument} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="count" fill="#c62032" radius={[6, 6, 0, 0]} name="Registros" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Formularios de hoy</h2>
                  <p className="mt-1 text-sm text-slate-500">Movimientos recientes reportados por el sistema.</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {stats.pendingForms.length} actividad{stats.pendingForms.length !== 1 ? 'es' : ''}
                </span>
              </div>

              {stats.pendingForms.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <CalendarClock className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-600">No hay actividad registrada hoy.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {stats.pendingForms.map((form) => (
                    <div key={form.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{form.description}</p>
                          <p className="mt-1 text-sm text-slate-500">Por: {form.user}</p>
                        </div>
                      </div>
                      <span className="text-sm text-slate-500">{form.created_at}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">Actividad reciente</p>
                <p className="mt-2 text-3xl font-semibold text-[#1e2b66]">{recentActivityCount}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Registros acumulados en el rango visible del gráfico principal.</p>
              </div>

              <QuickAction
                title="Gestionar usuarios"
                description="Crear usuarios y ajustar permisos"
                icon={UserPlus}
                onClick={() => navigate('/dashboard-admin/users')}
              />
              <QuickAction
                title="Gestionar documentos"
                description="Crear formularios y revisar registros"
                icon={FilePlus2}
                accent="red"
                onClick={() => navigate('/dashboard-admin/documents')}
              />
            </aside>
          </section>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};