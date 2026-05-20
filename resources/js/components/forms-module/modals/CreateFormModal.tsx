import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Bell, Check, Clock, FilePlus2, Info, Loader2, X } from 'lucide-react';
import { CreateFormData, DocumentType } from '../types/types';
import ColumnBuilder from '../ColumnBuilder';
import { formsService } from '@/lib/formService';

interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateFormModal: React.FC<CreateFormModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateFormData>({
    name: '',
    slug: '',
    columns: [],
    document_type_id: null,
    is_notification_enabled: false,
    notification_time: '08:00'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);

  const requiredColumns = useMemo(
    () => formData.columns.filter(column => column.required).length,
    [formData.columns]
  );

  const selectedTypeName = useMemo(
    () => documentTypes.find(type => type.id === formData.document_type_id)?.name || 'Sin tipo',
    [documentTypes, formData.document_type_id]
  );

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      columns: [],
      document_type_id: null,
      is_notification_enabled: false,
      notification_time: '08:00'
    });
    setError('');
    setAutoSlug(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    formsService.getDocumentTypes()
      .then((types) => {
        if (isMounted) setDocumentTypes(types);
      })
      .catch(() => {
        if (isMounted) setError('No fue posible cargar los tipos de documento.');
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  useEffect(() => {
    if (autoSlug) {
      const generatedSlug = formData.name ? formsService.generateSlug(formData.name) : '';
      setFormData(prev => ({
        ...prev,
        slug: generatedSlug
      }));
    }
  }, [formData.name, autoSlug]);

  const validateForm = (): boolean => {
    const reservedColumnNames = new Set([
      'id',
      'created_by',
      'status',
      'reviewer_id',
      'reviewed_at',
      'review_comments',
      'created_at',
      'updated_at',
    ]);
    const usedColumnNames = new Set<string>();

    // Validar nombre
    if (!formData.name.trim()) {
      setError('El nombre del formulario es obligatorio');
      return false;
    }

    // Validar slug
    if (!formData.slug.trim()) {
      setError('El slug es obligatorio');
      return false;
    }

    // Validar formato del slug
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(formData.slug)) {
      setError('El slug solo puede contener letras minúsculas, números y guiones');
      return false;
    }

    // Validar columnas
    if (formData.columns.length === 0) {
      setError('Debe agregar al menos una columna');
      return false;
    }

    // Validar cada columna
    for (let i = 0; i < formData.columns.length; i++) {
      const col = formData.columns[i];
      const columnName = col.name.trim();
      
      if (!columnName || !col.label.trim()) {
        setError(`La columna #${i + 1} debe tener nombre y etiqueta`);
        return false;
      }

      // Validar formato del nombre de columna (solo snake_case)
      const columnNameRegex = /^[a-z][a-z0-9_]*$/;
      if (!columnNameRegex.test(columnName)) {
        setError(`La columna #${i + 1}: El nombre debe estar en formato snake_case (solo letras minúsculas, números y _)`);
        return false;
      }

      if (columnName.length > 64) {
        setError(`La columna #${i + 1}: El nombre técnico no puede superar 64 caracteres`);
        return false;
      }

      if (reservedColumnNames.has(columnName)) {
        setError(`La columna #${i + 1}: "${columnName}" es un nombre reservado por el sistema`);
        return false;
      }

      if (usedColumnNames.has(columnName)) {
        setError(`La columna #${i + 1}: El nombre técnico "${columnName}" está repetido`);
        return false;
      }

      usedColumnNames.add(columnName);

      // Validar opciones para tipo enum
      if (col.type === 'enum' && (!col.options || col.options.length === 0)) {
        setError(`La columna #${i + 1} de tipo "Lista de Opciones" debe tener al menos una opción`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar formulario
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        document_type_id: formData.document_type_id,
        is_notification_enabled: formData.is_notification_enabled,
        notification_time: formData.is_notification_enabled ? formData.notification_time : null,
        columns: formData.columns.map(col => ({
          name: col.name.trim(),
          type: col.type,
          label: col.label.trim(),
          required: col.required || false,
          options: col.type === 'enum' ? col.options : undefined
        }))
      };

      await formsService.createForm(payload);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.message.includes('Network') || err.message.includes('Failed to fetch')) {
        setError('Error de conexión. Verifique que el servidor esté funcionando.');
      } else if (err.message.includes('slug already exists')) {
        setError('El slug ya existe. Por favor use un slug diferente.');
      } else if (err.message.includes('Unauthorized') || err.message.includes('token')) {
        setError('No tiene permisos para crear formularios. Verifique su sesión.');
      } else {
        setError(err.message || 'Error al crear el formulario');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestClose = () => {
    if (!isLoading) onClose();
  };

  const fieldClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10 disabled:bg-slate-100 disabled:text-slate-500';
  const labelClassName = 'mb-2 block text-sm font-semibold text-slate-700';

  return (
    <AnimatePresence mode="wait" onExitComplete={resetForm}>
      {isOpen && (
        <motion.div
          key="create-document-backdrop"
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
            aria-labelledby="create-document-title"
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-lg sm:border sm:border-slate-200"
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
                    <FilePlus2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Nuevo documento</p>
                    <h2 id="create-document-title" className="mt-1 text-xl font-semibold tracking-normal text-slate-950 sm:text-2xl">
                      Crear documento
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                      Define la información base y los campos que el equipo diligenciará en el sistema MIS.
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

              <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/80">
                <div className="border-r border-slate-200 px-4 py-3 sm:px-6">
                  <p className="text-xs font-medium text-slate-500">Campos</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{formData.columns.length}</p>
                </div>
                <div className="border-r border-slate-200 px-4 py-3 sm:px-6">
                  <p className="text-xs font-medium text-slate-500">Requeridos</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{requiredColumns}</p>
                </div>
                <div className="min-w-0 px-4 py-3 sm:px-6">
                  <p className="text-xs font-medium text-slate-500">Tipo</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-950">{selectedTypeName}</p>
                </div>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
                <div className="mx-auto grid max-w-5xl gap-5">
                  {error && (
                    <motion.div
                      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <span className="flex-1">{error}</span>
                    </motion.div>
                  )}

                  <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-[#1e2b66]">
                        <Info className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">Información base</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Estos datos identifican el documento y su configuración operativa.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className={labelClassName}>
                          Nombre del documento <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(event) => setFormData(prev => ({ ...prev, name: event.target.value }))}
                          placeholder="Ej: Registro de pruebas de donantes"
                          className={fieldClassName}
                          disabled={isLoading}
                        />
                      </div>

                      <div>
                        <label className={labelClassName}>
                          Slug <span className="text-red-600">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.slug}
                            onChange={(event) => {
                              setAutoSlug(false);
                              setFormData(prev => ({ ...prev, slug: event.target.value }));
                            }}
                            placeholder="registro-pruebas-donantes"
                            className={`${fieldClassName} font-mono`}
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setAutoSlug(!autoSlug)}
                            aria-pressed={autoSlug}
                            className={`shrink-0 rounded-lg border px-3 text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10 disabled:cursor-not-allowed disabled:opacity-50 ${
                              autoSlug
                                ? 'border-[#1e2b66]/30 bg-[#1e2b66]/10 text-[#1e2b66]'
                                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                            }`}
                            disabled={isLoading}
                          >
                            {autoSlug ? 'Auto' : 'Manual'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className={labelClassName}>Tipo de documento</label>
                        <select
                          value={formData.document_type_id ?? ''}
                          onChange={(event) => setFormData(prev => ({ ...prev, document_type_id: event.target.value ? Number(event.target.value) : null }))}
                          className={fieldClassName}
                          disabled={isLoading}
                        >
                          <option value="">Seleccione un tipo...</option>
                          {documentTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700">
                                <Bell className="h-5 w-5" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">Recordatorios por correo</p>
                                <p className="mt-1 text-sm leading-5 text-slate-600">
                                  Notifica a los usuarios asignados todos los días a una hora definida.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={formData.is_notification_enabled}
                              onClick={() => setFormData(prev => ({ ...prev, is_notification_enabled: !prev.is_notification_enabled }))}
                              className={`relative h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10 disabled:cursor-not-allowed disabled:opacity-50 ${
                                formData.is_notification_enabled ? 'bg-[#1e2b66]' : 'bg-slate-300'
                              }`}
                              disabled={isLoading}
                            >
                              <span
                                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                                  formData.is_notification_enabled ? 'left-6' : 'left-1'
                                }`}
                              />
                            </button>
                          </div>

                          <AnimatePresence initial={false}>
                            {formData.is_notification_enabled && (
                              <motion.div
                                className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <Clock className="h-4 w-4 text-[#1e2b66]" />
                                  Hora de envío
                                </label>
                                <input
                                  type="time"
                                  value={formData.notification_time || '08:00'}
                                  onChange={(event) => setFormData(prev => ({ ...prev, notification_time: event.target.value }))}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-950 outline-none transition focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10 sm:w-40"
                                  disabled={isLoading}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <ColumnBuilder
                      columns={formData.columns}
                      onChange={(columns) => setFormData(prev => ({ ...prev, columns }))}
                    />
                  </section>
                </div>
              </div>

              <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-600">
                    {formData.columns.length > 0
                      ? `${formData.columns.length} campo${formData.columns.length !== 1 ? 's' : ''} definido${formData.columns.length !== 1 ? 's' : ''}`
                      : 'Agrega al menos un campo para crear el documento.'}
                  </p>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
                      disabled={isLoading || formData.columns.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e2b66] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Crear documento
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

export default CreateFormModal;
