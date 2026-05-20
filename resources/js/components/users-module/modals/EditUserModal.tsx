import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { DocumentPermission, EditUserModalProps, UserFormData } from '../types/types';
import { formsService, DynamicForm } from '../../../lib/formService';

interface ExtendedUserFormData extends UserFormData {
  document_permissions: DocumentPermission[];
}

const emptyFormData: ExtendedUserFormData = {
  nombre: '',
  correo: '',
  password: '',
  telefono: '',
  rol: 'user',
  document_permissions: [],
};

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  onSubmit,
  onClose,
  isLoading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [expandedDocuments, setExpandedDocuments] = useState<Record<number, boolean>>({});
  const [availableDocuments, setAvailableDocuments] = useState<DynamicForm[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [formData, setFormData] = useState<ExtendedUserFormData>(emptyFormData);
  const [error, setError] = useState('');

  const stats = useMemo(() => ({
    total: availableDocuments.length,
    withAccess: formData.document_permissions.filter(permission => permission.can_view).length,
    canEdit: formData.document_permissions.filter(permission => permission.can_edit).length,
    canReview: formData.document_permissions.filter(permission => permission.can_review).length,
  }), [availableDocuments.length, formData.document_permissions]);

  useEffect(() => {
    if (!isOpen || !user) return;

    setCurrentStep(1);
    setExpandedDocuments({});
    setAvailableDocuments([]);
    setError('');
    setFormData({
      nombre: user.nombre,
      correo: user.correo,
      password: '',
      telefono: user.telefono || '',
      rol: user.rol,
      document_permissions: user.document_permissions || [],
    });
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  useEffect(() => {
    if (isOpen && currentStep === 2) {
      loadAvailableDocuments();
    }
  }, [isOpen, currentStep]);

  const loadAvailableDocuments = async () => {
    try {
      setLoadingDocuments(true);
      setError('');

      const documents = await formsService.getAllForms();
      setAvailableDocuments(documents);

      setFormData(prev => ({
        ...prev,
        document_permissions: documents.map((document) => {
          const existingPermission = prev.document_permissions.find(permission => permission.document_id === document.id);

          return {
            document_id: document.id,
            document_name: document.name,
            document_slug: document.slug,
            can_view: existingPermission?.can_view ?? false,
            can_edit: existingPermission?.can_edit ?? false,
            can_delete: existingPermission?.can_delete ?? false,
            can_review: existingPermission?.can_review ?? false,
          };
        }),
      }));
    } catch (err: any) {
      setError(err?.message || 'No fue posible cargar los documentos disponibles.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const validateStepOne = () => {
    if (!formData.nombre.trim()) return 'El nombre del usuario es obligatorio.';
    if (!formData.correo.trim()) return 'El correo institucional es obligatorio.';
    if (!/^\S+@\S+\.\S+$/.test(formData.correo.trim())) return 'Ingresa un correo válido.';
    if (formData.password && formData.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    return '';
  };

  const buildPayload = (): UserFormData => ({
    nombre: formData.nombre.trim(),
    correo: formData.correo.trim().toLowerCase(),
    password: formData.password,
    telefono: formData.telefono.trim(),
    rol: formData.rol,
    document_permissions: formData.document_permissions.filter(permission => permission.can_view),
  });

  const submitUser = async () => {
    const payload = buildPayload();
    if (!payload.password) {
      delete (payload as Partial<UserFormData>).password;
    }
    await onSubmit(payload);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (currentStep === 1) {
      const validationError = validateStepOne();
      if (validationError) {
        setError(validationError);
        return;
      }

      if (formData.rol === 'admin' || formData.rol === 'super-admin') {
        try {
          await onSubmit({ ...buildPayload(), document_permissions: [] });
        } catch (err: any) {
          setError(err?.message || 'No pudimos actualizar el usuario.');
        }
        return;
      }

      setCurrentStep(2);
      return;
    }

    try {
      await submitUser();
    } catch (err: any) {
      setError(err?.message || 'No pudimos actualizar el usuario.');
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (documentId: number, field: keyof DocumentPermission, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      document_permissions: prev.document_permissions.map(permission => {
        if (permission.document_id !== documentId) return permission;

        const nextPermission = { ...permission, [field]: value };

        if (field === 'can_view' && !value) {
          nextPermission.can_edit = false;
          nextPermission.can_delete = false;
          nextPermission.can_review = false;
        }

        if (field === 'can_edit' && value) nextPermission.can_view = true;
        if (field === 'can_edit' && !value) nextPermission.can_delete = false;
        if (field === 'can_delete' && value) {
          nextPermission.can_view = true;
          nextPermission.can_edit = true;
        }
        if (field === 'can_review' && value) nextPermission.can_view = true;

        return nextPermission;
      }),
    }));
  };

  const handleRequestClose = () => {
    if (!isLoading) onClose();
  };

  const fieldClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10 disabled:bg-slate-100 disabled:text-slate-500';
  const labelClassName = 'mb-2 block text-sm font-semibold text-slate-700';

  return (
    <AnimatePresence mode="wait">
      {isOpen && user && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={handleRequestClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-4xl sm:rounded-lg sm:border sm:border-slate-200"
            initial={{ opacity: 0, y: 28, scale: 0.98, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 22, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.8 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="shrink-0 border-b border-slate-200 bg-white">
              <div className="h-1 bg-[#1e2b66]" />
              <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                    <UserCog className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Editar acceso</p>
                    <h2 id="edit-user-title" className="mt-1 text-xl font-semibold tracking-normal text-slate-950 sm:text-2xl">
                      Editar usuario
                    </h2>
                    <p className="mt-1 max-w-2xl truncate text-sm leading-6 text-slate-600">
                      {user.nombre} - {user.correo}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                  aria-label="Cerrar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Información</span>
                  <span>{currentStep}/2</span>
                  <span>Permisos</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full bg-[#1e2b66]"
                    animate={{ width: `${(currentStep / 2) * 100}%` }}
                    transition={{ duration: 0.25 }}
                  />
                </div>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
                <div className="mx-auto max-w-3xl space-y-5">
                  {error && (
                    <motion.div
                      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <AnimatePresence mode="wait">
                    {currentStep === 1 ? (
                      <motion.section
                        key="user-info"
                        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 14 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="mb-5 flex items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                            <Users className="h-5 w-5" />
                          </span>
                          <div>
                            <h3 className="text-base font-semibold text-slate-950">Información del usuario</h3>
                            <p className="mt-1 text-sm leading-6 text-slate-600">Actualiza los datos base o deja la contraseña vacía para conservarla.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <label className={labelClassName}>Nombre completo <span className="text-red-600">*</span></label>
                            <input name="nombre" value={formData.nombre} onChange={handleChange} className={fieldClassName} placeholder="Ej: Juan Pérez" disabled={isLoading} />
                          </div>
                          <div>
                            <label className={labelClassName}>Correo <span className="text-red-600">*</span></label>
                            <div className="relative">
                              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input type="email" name="correo" value={formData.correo} onChange={handleChange} className={`${fieldClassName} pl-10`} placeholder="usuario@huv.gov.co" disabled={isLoading} />
                            </div>
                          </div>
                          <div>
                            <label className={labelClassName}>Teléfono</label>
                            <div className="relative">
                              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input name="telefono" value={formData.telefono} onChange={handleChange} className={`${fieldClassName} pl-10`} placeholder="3001234567" disabled={isLoading} />
                            </div>
                          </div>
                          <div>
                            <label className={labelClassName}>Contraseña</label>
                            <div className="relative">
                              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input type="password" name="password" value={formData.password} onChange={handleChange} className={`${fieldClassName} pl-10`} placeholder="Dejar vacío para conservar" disabled={isLoading} />
                            </div>
                          </div>
                          <div>
                            <label className={labelClassName}>Rol <span className="text-red-600">*</span></label>
                            <select name="rol" value={formData.rol} onChange={handleChange} className={fieldClassName} disabled={isLoading}>
                              <option value="user">Usuario regular</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Administrador</option>
                              {user.rol === 'super-admin' && <option value="super-admin">Super administrador</option>}
                            </select>
                          </div>
                        </div>
                      </motion.section>
                    ) : (
                      <motion.section
                        key="user-permissions"
                        className="space-y-4"
                        initial={{ opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -14 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                          <div className="mb-4 flex items-start gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                              <ShieldCheck className="h-5 w-5" />
                            </span>
                            <div>
                              <h3 className="text-base font-semibold text-slate-950">Permisos documentales</h3>
                              <p className="mt-1 text-sm leading-6 text-slate-600">Actualiza documentos y capacidades asignadas.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Metric label="Documentos" value={stats.total} />
                            <Metric label="Acceso" value={stats.withAccess} />
                            <Metric label="Edición" value={stats.canEdit} />
                            <Metric label="Revisión" value={stats.canReview} accent />
                          </div>
                        </div>

                        <div className="max-h-[44vh] space-y-3 overflow-y-auto pr-1">
                          {loadingDocuments ? (
                            <div className="flex h-40 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-600">
                              <Loader2 className="h-5 w-5 animate-spin text-[#1e2b66]" />
                              Cargando documentos...
                            </div>
                          ) : formData.document_permissions.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                              <FileText className="mx-auto h-8 w-8 text-slate-400" />
                              <p className="mt-3 text-sm font-semibold text-slate-800">No hay documentos disponibles</p>
                            </div>
                          ) : formData.document_permissions.map((permission) => {
                            const isExpanded = expandedDocuments[permission.document_id] || false;

                            return (
                              <div key={permission.document_id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between gap-3 p-4">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedDocuments(prev => ({ ...prev, [permission.document_id]: !isExpanded }))}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                  >
                                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${isExpanded ? 'rotate-180' : ''}`} />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-950">{permission.document_name}</p>
                                      <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{permission.document_slug}</p>
                                    </div>
                                  </button>
                                  <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={permission.can_view}
                                      onChange={(event) => handlePermissionChange(permission.document_id, 'can_view', event.target.checked)}
                                      className="h-4 w-4 rounded border-slate-300 text-[#1e2b66] focus:ring-[#1e2b66]"
                                      disabled={isLoading}
                                    />
                                    Acceso
                                  </label>
                                </div>

                                <AnimatePresence initial={false}>
                                  {isExpanded && permission.can_view && (
                                    <motion.div
                                      className="overflow-hidden border-t border-slate-100"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.18 }}
                                    >
                                      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
                                        <PermissionToggle label="Editar" description="Crear y modificar registros" checked={permission.can_edit} disabled={isLoading} onChange={(checked) => handlePermissionChange(permission.document_id, 'can_edit', checked)} />
                                        <PermissionToggle label="Eliminar" description="Eliminar registros" checked={permission.can_delete} disabled={isLoading} onChange={(checked) => handlePermissionChange(permission.document_id, 'can_delete', checked)} danger />
                                        <PermissionToggle label="Revisar" description="Aprobar o devolver registros" checked={!!permission.can_review} disabled={isLoading} onChange={(checked) => handlePermissionChange(permission.document_id, 'can_review', checked)} />
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </motion.section>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    {currentStep === 1 ? 'Actualiza los datos base del usuario.' : `${stats.withAccess} documento${stats.withAccess !== 1 ? 's' : ''} con acceso.`}
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    {currentStep === 2 && (
                      <button
                        type="button"
                        onClick={() => { setCurrentStep(1); setError(''); }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Atrás
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRequestClose}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || (currentStep === 2 && loadingDocuments)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e2b66] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : currentStep === 1 && formData.rol !== 'admin' && formData.rol !== 'super-admin' ? (
                        <>
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Guardar cambios
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </footer>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface MetricProps {
  label: string;
  value: number;
  accent?: boolean;
}

const Metric = ({ label, value, accent = false }: MetricProps) => (
  <div className={`rounded-lg border px-3 py-3 ${accent ? 'border-red-100 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
    <p className={`text-xs font-medium ${accent ? 'text-red-700' : 'text-slate-500'}`}>{label}</p>
    <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
  </div>
);

interface PermissionToggleProps {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  danger?: boolean;
  onChange: (checked: boolean) => void;
}

const PermissionToggle = ({ label, description, checked, disabled, danger = false, onChange }: PermissionToggleProps) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-[#1e2b66]/30">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className={`mt-0.5 h-4 w-4 rounded border-slate-300 focus:ring-[#1e2b66] ${danger ? 'text-red-600' : 'text-[#1e2b66]'}`}
      disabled={disabled}
    />
    <span>
      <span className="block text-sm font-semibold text-slate-800">{label}</span>
      <span className="block text-xs leading-5 text-slate-500">{description}</span>
    </span>
  </label>
);

export default EditUserModal;
