// modules/user/UserDashboardHome.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserDashboardLayout } from '@/components/layouts/UserDashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/providers/AuthContext';
import { dashboardService, UserDashboardStats } from '@/lib/dashboardService';
import {
  AlertCircle,
  ArrowRight,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const chartTooltipStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.10)',
  color: '#0f172a',
};

const formatDateLabel = (date: string) => {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

interface MetricTileProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: 'blue' | 'red';
}

const MetricTile: React.FC<MetricTileProps> = ({ label, value, icon: Icon, tone = 'blue' }) => {
  const toneClassName = {
    blue: 'bg-[#1e2b66]/10 text-[#1e2b66]',
    red: 'bg-red-50 text-red-700',
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
      setError('');
      const data = await dashboardService.getUserDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const recentActivityCount = stats?.recordsPerDay.reduce((total, day) => total + Number(day.count || 0), 0) ?? 0;

  if (loading) {
    return (
      <ProtectedRoute requiredRole="user">
        <UserDashboardLayout>
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="h-10 w-10 animate-spin text-[#1e2b66]" />
              <p className="text-sm font-medium">Cargando dashboard...</p>
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
          <div className="rounded-lg border border-red-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-lg font-semibold text-slate-950">Error al cargar</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {error || 'No se pudieron cargar los datos del dashboard.'}
              </p>
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
        </UserDashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="user">
      <UserDashboardLayout>
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Inicio</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-950">
                  Hola, {user?.nombre || 'Usuario'}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Consulta tus documentos asignados y la actividad reciente de tus registros en el sistema MIS.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">Sesión</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">{user?.nombre || 'Usuario'}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <MetricTile label="Documentos disponibles" value={stats.availableDocuments} icon={FolderOpen} />
            <MetricTile label="Registros (últimos 7 días)" value={stats.recentRecordsCount} icon={TrendingUp} tone="red" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Actividad reciente</h2>
                  <p className="mt-1 text-sm text-slate-500">Registros creados en los últimos 7 días</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#1e2b66]">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="h-80">
                {stats.recordsPerDay.length === 0 ? (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
                    <FileText className="h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-600">Aún no hay registros recientes para graficar.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 1, height: 1 }}>
                    <BarChart data={stats.recordsPerDay} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatDateLabel} />
                      <Bar dataKey="count" fill="#1e2b66" radius={[6, 6, 0, 0]} name="Registros" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-950">Registros recientes</p>
                <p className="mt-2 text-3xl font-semibold text-[#1e2b66]">{recentActivityCount}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Total de registros creados en el rango visible del gráfico.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/dashboard-users/documents')}
                className="group flex w-full items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#1e2b66]/30 hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">Ver mis documentos</p>
                    <p className="mt-1 truncate text-sm text-slate-500">Explora los documentos asignados</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#1e2b66]" />
              </button>
            </aside>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Mis documentos</h2>
                <p className="mt-1 text-sm text-slate-500">Documentos asignados a tu usuario.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <FileText className="h-3.5 w-3.5" />
                {stats.myDocuments.length} documento{stats.myDocuments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {stats.myDocuments.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <FileText className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">No tienes documentos asignados todavía.</p>
              </div>
            ) : (
              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {stats.myDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => navigate(`/dashboard-users/documents/${doc.id}`)}
                    className="flex cursor-pointer flex-col rounded-lg border border-slate-200 bg-white p-4 transition hover:border-[#1e2b66]/35 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-slate-950">{doc.name}</h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {doc.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {doc.can_create && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/dashboard-users/documents/${doc.id}/new`);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e2b66] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#172252]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Crear registro
                        </button>
                      )}
                      {doc.can_edit && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Puede editar
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </UserDashboardLayout>
    </ProtectedRoute>
  );
};
