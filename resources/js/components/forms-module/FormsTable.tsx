import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/providers/AuthContext';
import CreateFormModal from './modals/CreateFormModal';
import ViewFormModal from './modals/ViewFormModal';
import DeleteFormModal from './modals/DeleteFormModal';
import { DynamicForm } from './types/types';
import { formsService } from '@/lib/formService';
import { useNavigate } from 'react-router-dom';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/providers/ToastContext';
import { getNotificationCopy, NotificationKey } from '@/constants/notifications';
import ManageDocumentTypesModal from './modals/ManageDocumentTypesModal';
import ManageDocumentPermissionsModal from './modals/ManageDocumentPermissionsModal';
import {
  AlertCircle,
  Bell,
  CalendarDays,
  Columns3,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tags,
  Trash2,
} from 'lucide-react';

const FormsTable: React.FC = () => {
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  // Estados para modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false); // Nuevo estado
  const [selectedForm, setSelectedForm] = useState<DynamicForm | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showManageTypesModal, setShowManageTypesModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { hasRole } = useAuth();
  const { success, error: toastError } = useToast();
  const canManage = hasRole('admin') || hasRole('super-admin');

  const totalColumns = useMemo(
    () => forms.reduce((sum, form) => sum + form.columns_config.length, 0),
    [forms]
  );

  const notificationCount = useMemo(
    () => forms.filter((form) => form.is_notification_enabled).length,
    [forms]
  );

  const filteredForms = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return forms;

    return forms.filter((form) => {
      const typeName = form.type?.name || '';
      return [form.name, form.slug, typeName]
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [forms, searchTerm]);

  const paginatedForms = useMemo(
    () => filteredForms.slice((page - 1) * pageSize, page * pageSize),
    [filteredForms, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  const emitFormToast = (variant: 'success' | 'error', key: NotificationKey<'forms'>) => {
    const copy = getNotificationCopy('forms', key);
    const handler = variant === 'success' ? success : toastError;
    handler(copy.title, { description: copy.description });
    if (variant === 'error') {
      setError(copy.description ?? copy.title);
    } else {
      setError('');
    }
    return copy;
  };

  // Cargar formularios
  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const formsData = await formsService.getAllForms();
      setForms(formsData);
      setError('');
    } catch {
      emitFormToast('error', 'loadError');
    } finally {
      setLoading(false);
    }
  };

  // Manejar eliminación
  const handleDeleteConfirm = async (formId: number) => {
    setActionLoading(true);
    setError('');

    try {
      await formsService.deleteForm(formId);
      setForms(prev => prev.filter(form => form.id !== formId));
      closeModals();
      emitFormToast('success', 'deleteSuccess');
    } catch {
      const copy = emitFormToast('error', 'deleteError');
      throw new Error(copy.title);
    } finally {
      setActionLoading(false);
    }
  };

  // Abrir modales
  const openCreateModal = () => setShowCreateModal(true);

  const openViewModal = (form: DynamicForm) => {
    setSelectedForm(form);
    setShowViewModal(true);
  };

  const openDeleteModal = (form: DynamicForm) => {
    setSelectedForm(form);
    setShowDeleteModal(true);
  };

  const openPermissionsModal = (form: DynamicForm) => {
      setSelectedForm(form);
      setShowPermissionsModal(true);
  };

  // Cerrar modales
  const closeModals = () => {
    setShowCreateModal(false);
    setShowViewModal(false);
    setShowDeleteModal(false);
    setShowPermissionsModal(false);
    setSelectedForm(null);
    setError('');
  };

  // Success handler para crear
  const handleCreateSuccess = () => {
    loadForms();
    emitFormToast('success', 'createSuccess');
  };

  // Función para obtener iniciales
  const getFormInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-600">
          <Loader2 className="h-10 w-10 animate-spin text-[#1e2b66]" />
          <p className="text-sm font-medium">Cargando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200">
            <div className="h-1 w-full bg-[#1e2b66]" />
            <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-start lg:justify-between lg:px-6">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Documentos</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 lg:text-3xl">
                  Gestión de documentos
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Administra formularios dinámicos, permisos y estructuras de captura del Banco de Sangre.
                </p>
              </div>

              {canManage && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setShowManageTypesModal(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#1e2b66] hover:text-[#1e2b66] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10"
                  >
                    <Tags className="h-4 w-4" />
                    Gestionar tipos
                  </button>

                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e2b66] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/20"
                  >
                    <Plus className="h-4 w-4" />
                    Crear documento
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 border-b border-slate-200 sm:grid-cols-3">
            <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Documentos</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{forms.length}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                  <FileText className="h-5 w-5" />
                </span>
              </div>
            </div>

            <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Campos configurados</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{totalColumns}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <Columns3 className="h-5 w-5" />
                </span>
              </div>
            </div>

            <div className="px-5 py-4 lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Recordatorios</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{notificationCount}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-700">
                  <Bell className="h-5 w-5" />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre, slug o tipo"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10"
              />
            </div>

            <button
              type="button"
              onClick={loadForms}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </section>

        <ManageDocumentTypesModal 
            isOpen={showManageTypesModal} 
            onClose={() => setShowManageTypesModal(false)} 
        />

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {filteredForms.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {forms.length === 0 ? 'No hay documentos creados' : 'No encontramos documentos'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                {forms.length === 0
                  ? 'Crea el primer documento dinámico para iniciar la captura de datos del Banco de Sangre.'
                  : 'Ajusta la búsqueda o actualiza la lista para revisar los documentos disponibles.'}
              </p>
              {canManage && forms.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mx-auto mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1e2b66] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252]"
                >
                  <Plus className="h-4 w-4" />
                  Crear documento
                </button>
              )}
            </div>
          )}

          {filteredForms.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Documento
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Tipo
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Campos
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Recordatorio
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Creado
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedForms.map((form) => (
                  <tr key={form.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66] text-sm font-semibold text-white shadow-sm">
                          {getFormInitials(form.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{form.name}</p>
                          <p className="mt-1 truncate font-mono text-xs text-slate-500">{form.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex max-w-[180px] items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <span className="truncate">{form.type?.name || 'Sin tipo'}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1e2b66]/10 px-2.5 py-1 text-xs font-semibold text-[#1e2b66]">
                        <Columns3 className="h-3.5 w-3.5" />
                        {form.columns_config.length} campos
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        form.is_notification_enabled ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Bell className="h-3.5 w-3.5" />
                        {form.is_notification_enabled ? form.notification_time || 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {new Date(form.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard-admin/documents/${form.id}`)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-[#1e2b66]/10 hover:text-[#1e2b66] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10"
                          title="Ver registros"
                          aria-label={`Ver registros de ${form.name}`}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        
                        {canManage && (
                          <button 
                            type="button"
                            onClick={() => openPermissionsModal(form)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-[#1e2b66]/10 hover:text-[#1e2b66] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10"
                            title="Gestionar Permisos"
                            aria-label={`Gestionar permisos de ${form.name}`}
                          >
                            <ShieldCheck className="h-5 w-5" />
                          </button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openDeleteModal(form)}
                            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
                            title="Eliminar formulario"
                            aria-label={`Eliminar ${form.name}`}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </section>

        {filteredForms.length > pageSize && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredForms.length}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>

      {/* Modales */}
      <CreateFormModal
        isOpen={showCreateModal}
        onClose={closeModals}
        onSuccess={handleCreateSuccess}
      />

      <ViewFormModal
        isOpen={showViewModal}
        form={selectedForm}
        onClose={closeModals}
      />

      <DeleteFormModal
        isOpen={showDeleteModal}
        form={selectedForm}
        onConfirm={handleDeleteConfirm}
        onClose={closeModals}
        isLoading={actionLoading}
      />

      <ManageDocumentPermissionsModal 
        show={showPermissionsModal} 
        onClose={closeModals} 
        formId={selectedForm?.id || 0} 
        formName={selectedForm?.name || ''} 
      />
    </>
  );
};

export default FormsTable;
