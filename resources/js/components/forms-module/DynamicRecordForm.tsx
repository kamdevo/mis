import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, CheckCircle, Clock, FileText, Loader2, MessageSquare, RotateCcw, Save, ShieldCheck, X, XCircle } from 'lucide-react';
import { DynamicForm, FormColumn, COLUMN_TYPES } from './types/types';
import { formsService } from '@/lib/formService';
import { getColumnIcon } from '@/components/ui/ColumnIcons';
import SignaturePad from '@/components/ui/SignaturePad';
import { useToast } from '@/providers/ToastContext';
import { getNotificationCopy, NotificationKey } from '@/constants/notifications';
import { useAuth } from '@/providers/AuthContext';

interface DynamicRecordFormProps {
  form: DynamicForm;
  documentId: number;
  recordId: number | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type ReviewIntent = 'approved' | 'returned' | null;

const DynamicRecordForm: React.FC<DynamicRecordFormProps> = ({
  form,
  documentId,
  recordId,
  onSuccess,
  onCancel,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = recordId !== null;

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [canReview, setCanReview] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent>(null);
  const [reviewComments, setReviewComments] = useState('');

  const { success: toastSuccess, error: toastError } = useToast();

  const requiredCount = useMemo(
    () => form.columns_config.filter((column) => column.required).length,
    [form.columns_config]
  );

  const emitRecordToast = (variant: 'success' | 'error', key: NotificationKey<'records'>) => {
    const copy = getNotificationCopy('records', key);
    const handler = variant === 'success' ? toastSuccess : toastError;
    handler(copy.title, { description: copy.description });
    return copy;
  };

  useEffect(() => {
    if (user && documentId) checkReviewPermission();
  }, [user, documentId]);

  useEffect(() => {
    if (isEditing && recordId) {
      loadRecord();
      return;
    }

    const defaultValues: Record<string, any> = {};
    form.columns_config.forEach((column) => {
      defaultValues[column.name] = column.type === 'boolean' ? false : '';
    });
    setFormData(defaultValues);
  }, [recordId, form.columns_config]);

  const checkReviewPermission = async () => {
    try {
      if (user?.rol === 'super-admin') {
        setCanReview(true);
        return;
      }

      const response = await axios.get(`/api/users/${user?.id}/document-permissions`);
      const permissions: any[] = response.data.data || [];
      const permission = permissions.find((item: any) => Number(item.document_id) === Number(documentId));
      setCanReview(Boolean(permission?.can_review));
    } catch {
      setCanReview(false);
    }
  };

  const loadRecord = async () => {
    if (!recordId) return;

    try {
      setLoading(true);
      const response = await formsService.getFormRecords(documentId);
      const recordsData = formsService.normalizeRecordsResponse(response);
      const record = recordsData.find((item: any) => item.id === recordId);

      if (!record) {
        setGeneralError('Registro no encontrado');
        return;
      }

      const normalizedRecord = { ...record };
      form.columns_config.forEach((column) => {
        if (column.type === 'boolean' && column.name in normalizedRecord) {
          const value = normalizedRecord[column.name];
          normalizedRecord[column.name] = value === true || value === 'true' || value === 1;
        }
      });

      setFormData(normalizedRecord);
    } catch (err: any) {
      setGeneralError(err.message || 'Error al cargar registro');
      emitRecordToast('error', 'loadError');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (columnName: string, value: any) => {
    setFormData((currentData) => ({ ...currentData, [columnName]: value }));

    if (errors[columnName]) {
      setErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors[columnName];
        return nextErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    form.columns_config.forEach((column) => {
      if (column.required) {
        const value = formData[column.name];
        if (value === undefined || value === null || value === '') {
          nextErrors[column.name] = `${column.label} es obligatorio`;
        }
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    setGeneralError('');

    if (!validateForm()) {
      setGeneralError('Completa los campos obligatorios antes de guardar.');
      return;
    }

    try {
      setSaving(true);

      const dataToSave = { ...formData };
      delete dataToSave.id;
      delete dataToSave.created_at;
      delete dataToSave.updated_at;
      delete dataToSave.status;
      delete dataToSave.reviewer_id;
      delete dataToSave.reviewed_at;
      delete dataToSave.review_comments;

      if (isEditing && recordId) {
        await formsService.updateFormRecord(documentId, recordId, dataToSave);
        emitRecordToast('success', 'updateSuccess');
      } else {
        await formsService.createFormRecord(documentId, dataToSave);
        emitRecordToast('success', 'createSuccess');
      }

      if (onSuccess) onSuccess();
      else navigate(`/dashboard-admin/documents/${documentId}`);
    } catch (err: any) {
      setGeneralError(err.message || 'Error al guardar registro');
      emitRecordToast('error', isEditing ? 'updateError' : 'createError');
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    if (!reviewIntent || !recordId) return;

    const comments = reviewComments.trim();
    if (reviewIntent === 'returned' && !comments) {
      setGeneralError('Indica el motivo de devolución antes de continuar.');
      return;
    }

    try {
      setReviewing(true);
      setGeneralError('');
      await formsService.reviewRecord(documentId, recordId, reviewIntent, comments);

      setFormData((currentData) => ({
        ...currentData,
        status: reviewIntent,
        review_comments: comments,
      }));

      toastSuccess('Revisión completada', {
        description: reviewIntent === 'approved' ? 'Registro aprobado correctamente.' : 'Registro devuelto correctamente.',
      });
      setReviewIntent(null);
      setReviewComments('');
      onSuccess?.();
    } catch {
      toastError('Error', { description: 'No se pudo guardar la revisión.' });
    } finally {
      setReviewing(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigate(`/dashboard-admin/documents/${documentId}`);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle className="h-3.5 w-3.5" />Aprobado</span>;
      case 'returned':
        return <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"><XCircle className="h-3.5 w-3.5" />Devuelto</span>;
      case 'in_review':
        return <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><Clock className="h-3.5 w-3.5" />En revisión</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600"><Clock className="h-3.5 w-3.5" />Borrador</span>;
    }
  };

  const renderInput = (column: FormColumn) => {
    const value = formData[column.name] ?? '';
    const hasError = !!errors[column.name];
    const baseClassName = `w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10 ${
      hasError ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-100' : 'border-slate-200'
    }`;

    switch (column.type) {
      case 'text':
        return (
          <textarea
            value={value}
            onChange={(event) => handleInputChange(column.name, event.target.value)}
            className={`${baseClassName} min-h-28 py-3`}
            placeholder={column.placeholder || `Ingrese ${column.label.toLowerCase()}`}
          />
        );

      case 'enum':
        return (
          <select
            value={value}
            onChange={(event) => handleInputChange(column.name, event.target.value)}
            className={`${baseClassName} h-11`}
          >
            <option value="">Seleccionar...</option>
            {column.options?.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'signature':
        return (
          <SignaturePad
            value={value}
            onChange={(dataUrl) => handleInputChange(column.name, dataUrl)}
            hasError={hasError}
          />
        );

      case 'boolean': {
        const boolValue = value === true || value === 'true' || value === 1;
        return (
          <div className="inline-grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => handleInputChange(column.name, true)}
              className={`h-9 rounded-md px-4 text-sm font-semibold transition ${boolValue ? 'bg-[#1e2b66] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => handleInputChange(column.name, false)}
              className={`h-9 rounded-md px-4 text-sm font-semibold transition ${!boolValue ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              No
            </button>
          </div>
        );
      }

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(event) => handleInputChange(column.name, event.target.value)}
            className={`${baseClassName} h-11`}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={(event) => handleInputChange(column.name, event.target.value)}
            className={`${baseClassName} h-11`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(event) => handleInputChange(column.name, event.target.value)}
            className={`${baseClassName} h-11`}
            placeholder={column.placeholder || `Ingrese ${column.label.toLowerCase()}`}
          />
        );

      case 'decimal':
        return (
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(event) => handleInputChange(column.name, event.target.value)}
            className={`${baseClassName} h-11`}
            placeholder={column.placeholder || `Ingrese ${column.label.toLowerCase()}`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(event) => handleInputChange(column.name, event.target.value)}
            className={`${baseClassName} h-11`}
            placeholder={column.placeholder || `Ingrese ${column.label.toLowerCase()}`}
            maxLength={column.max_length}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-600">
          <Loader2 className="h-10 w-10 animate-spin text-[#1e2b66]" />
          <p className="text-sm font-medium">Cargando registro...</p>
        </div>
      </div>
    );
  }

  const canSave = !isEditing || formData.status !== 'approved' || user?.rol === 'super-admin';
  const canShowReviewActions = isEditing && canReview && ['draft', 'in_review', 'returned'].includes(formData.status || 'draft');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">
              {isEditing ? 'Editar registro' : 'Nuevo registro'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-950">
                {isEditing ? `Registro #${recordId}` : 'Crear registro'}
              </h1>
              {isEditing && getStatusBadge(formData.status)}
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-2 text-sm text-slate-600">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{form.name}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canShowReviewActions && (
              <>
                <button
                  type="button"
                  onClick={() => setReviewIntent('returned')}
                  disabled={reviewing || saving}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  Devolver
                </button>
                <button
                  type="button"
                  onClick={() => setReviewIntent('approved')}
                  disabled={reviewing || saving}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Aprobar
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleCancel}
              disabled={saving || reviewing}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>

            {canSave && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || reviewing}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e2b66] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Campos</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{form.columns_config.length}</p>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-xs font-medium text-red-700">Obligatorios</p>
            <p className="mt-1 text-2xl font-semibold text-red-700">{requiredCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Modo</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{isEditing ? 'Edición' : 'Creación'}</p>
          </div>
        </div>
      </div>

      {isEditing && formData.status === 'returned' && formData.review_comments && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Motivo de devolución</p>
              <p className="mt-1 text-sm leading-6">{formData.review_comments}</p>
            </div>
          </div>
        </div>
      )}

      {generalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{generalError}</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">Campos del registro</h2>
          <p className="mt-1 text-sm text-slate-500">Los campos marcados con asterisco son obligatorios.</p>
        </div>

        <div className="divide-y divide-slate-100">
          {form.columns_config.map((column) => (
            <div key={column.name} className="p-5 transition hover:bg-slate-50/70">
              <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-start">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${errors[column.name] ? 'bg-red-50 text-red-600' : 'bg-[#1e2b66]/10 text-[#1e2b66]'}`}>
                    {getColumnIcon(column.type, 'h-5 w-5')}
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold text-slate-950">
                      {column.label}
                      {column.required && <span className="ml-1 text-red-600">*</span>}
                    </label>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {COLUMN_TYPES.find((type) => type.value === column.type)?.label || column.type}
                    </p>
                  </div>
                </div>

                <div>
                  {column.help_text && (
                    <p className="mb-2 text-sm text-slate-500">{column.help_text}</p>
                  )}

                  {renderInput(column)}

                  {errors[column.name] && (
                    <div className="mt-2 flex items-center gap-2 text-sm font-medium text-red-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errors[column.name]}</span>
                    </div>
                  )}

                  {column.type === 'enum' && column.options && !errors[column.name] && (
                    <p className="mt-2 text-xs text-slate-500">
                      {column.options.length} opción{column.options.length !== 1 ? 'es' : ''} disponible{column.options.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-950">{form.columns_config.length}</span> campos configurados
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || reviewing || !canSave}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e2b66] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar registro'}
          </button>
        </div>
      </div>

      {reviewIntent && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Revisión</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-950">
                {reviewIntent === 'approved' ? 'Aprobar registro' : 'Devolver registro'}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {reviewIntent === 'approved'
                  ? 'Confirma que el registro cumple con los datos requeridos.'
                  : 'Registra el motivo para que el equipo pueda corregirlo.'}
              </p>
            </div>

            {reviewIntent === 'returned' && (
              <div className="px-5 py-4">
                <label className="text-sm font-semibold text-slate-950">Motivo de devolución</label>
                <textarea
                  value={reviewComments}
                  onChange={(event) => setReviewComments(event.target.value)}
                  className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10"
                  placeholder="Describe el ajuste necesario"
                />
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => { setReviewIntent(null); setReviewComments(''); }}
                disabled={reviewing}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitReview}
                disabled={reviewing}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${reviewIntent === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : reviewIntent === 'approved' ? <ShieldCheck className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                {reviewing ? 'Guardando...' : reviewIntent === 'approved' ? 'Aprobar' : 'Devolver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicRecordForm;
