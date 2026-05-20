// components/forms-module/RecordsTable.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicForm } from './types/types';
import { formsService } from '@/lib/formService';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/providers/ToastContext';
import { getNotificationCopy, NotificationKey } from '@/constants/notifications';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { AlertCircle, CalendarClock, CheckCircle2, Clock, Columns3, Edit3, FilePlus2, FileText, Loader2, Search, Trash2, XCircle } from 'lucide-react';

interface RecordsTableProps {
  form: DynamicForm;
  documentId: number;
  onRecordsChange?: () => void;
}

const RecordTable: React.FC<RecordsTableProps> = ({ form, documentId, onRecordsChange }) => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { success, error: toastError } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const emitRecordToast = (variant: 'success' | 'error', key: NotificationKey<'records'>) => {
    const copy = getNotificationCopy('records', key);
    const handler = variant === 'success' ? success : toastError;
    handler(copy.title, { description: copy.description });
    if (variant === 'error') {
      setError(copy.description ?? copy.title);
    } else {
      setError('');
    }
    return copy;
  };

  useEffect(() => {
    loadRecords();
  }, [documentId]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await formsService.getFormRecords(documentId);
      const recordsData = formsService.normalizeRecordsResponse(response);
      setRecords(recordsData);
      onRecordsChange?.();
    } catch {
      setRecords([]);
      emitRecordToast('error', 'loadError');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate(`/dashboard-admin/documents/${documentId}/new`);
  };

  const handleEdit = (recordId: number) => {
    navigate(`/dashboard-admin/documents/${documentId}/${recordId}`);
  };

  const handleDelete = async (recordId: number) => {
    try {
      setDeletingId(recordId);
      setError('');
      await formsService.deleteFormRecord(documentId, recordId);
      setRecords(prev => prev.filter(r => r.id !== recordId));
      onRecordsChange?.();
      emitRecordToast('success', 'deleteSuccess');
    } catch {
      emitRecordToast('error', 'deleteError');
    } finally {
      setDeletingId(null);
    }
  };

  const formatValue = (value: any, columnType: string): string => {
    if (value === null || value === undefined || value === '') return '-';
    
    switch (columnType) {
      case 'date':
        return new Date(value).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      case 'boolean':
        return value ? 'Sí' : 'No';
      case 'decimal':
      case 'number':
        return typeof value === 'number' ? value.toLocaleString('es-CO') : value;
      case 'signature':
        return 'Firma registrada';
      default:
        return String(value);
    }
  };

  const getStatusLabel = (status?: string): string => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'returned': return 'Devuelto';
      case 'in_review': return 'En revisión';
      default: return 'Borrador';
    }
  };

  const getStatusClassName = (status?: string): string => {
    switch (status) {
      case 'approved': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'returned': return 'border-red-200 bg-red-50 text-red-700';
      case 'in_review': return 'border-amber-200 bg-amber-50 text-amber-700';
      default: return 'border-slate-200 bg-slate-50 text-slate-600';
    }
  };

  const getLastUpdate = (): string => {
    const dates = records
      .map((record) => record.updated_at || record.created_at)
      .filter(Boolean)
      .map((date) => new Date(date).getTime())
      .filter((time) => !Number.isNaN(time));

    if (dates.length === 0) return 'Sin actividad';

    return new Date(Math.max(...dates)).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredRecords = records.filter((record) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    return [record.id, record.status, ...form.columns_config.map((column) => record[column.name])]
      .some((value) => String(value ?? '').toLowerCase().includes(term));
  });

  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-600">
          <Loader2 className="h-10 w-10 animate-spin text-[#1e2b66]" />
          <p className="text-sm font-medium">Cargando registros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Registros</p>
            <h1 className="mt-2 truncate text-2xl font-semibold text-slate-950">{form.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Consulta, crea y actualiza los registros asociados a este documento dinámico.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e2b66] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252]"
          >
            <FilePlus2 className="h-4 w-4" />
            Nuevo registro
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Total registros</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">{records.length}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
              <FileText className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Campos configurados</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">{form.columns_config.length}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Columns3 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Última actividad</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{getLastUpdate()}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-700">
              <CalendarClock className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }}
              placeholder="Buscar en registros"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10"
            />
          </div>
          <p className="text-sm text-slate-500">
            {filteredRecords.length} resultado{filteredRecords.length !== 1 ? 's' : ''}
          </p>
        </div>

        {records.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">No hay registros</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Crea el primer registro para empezar a alimentar este documento.
            </p>
            <button
              onClick={handleCreate}
              className="mx-auto mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e2b66] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252]"
            >
              <FilePlus2 className="h-4 w-4" />
              Crear primer registro
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Search className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-950">Sin resultados</h3>
            <p className="mt-1 text-sm text-slate-500">Ajusta la búsqueda para ver más registros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  ID
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Estado
                </th>
                {form.columns_config.map(column => (
                  <th key={column.name} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {column.label}
                    {column.required && <span className="text-red-500 ml-1">*</span>}
                  </th>
                ))}
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedRecords.map((record) => (
                <tr key={record.id} className="transition hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="inline-flex rounded-lg border border-[#1e2b66]/15 bg-[#1e2b66]/5 px-2.5 py-1 text-xs font-semibold text-[#1e2b66]">
                      #{record.id}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusClassName(record.status)}`}>
                      {record.status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {record.status === 'returned' && <XCircle className="h-3.5 w-3.5" />}
                      {record.status === 'in_review' && <Clock className="h-3.5 w-3.5" />}
                      {getStatusLabel(record.status)}
                    </span>
                  </td>
                  {form.columns_config.map(column => (
                    <td key={column.name} className="max-w-[240px] whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                      {column.type === 'signature' ? (
                        record[column.name] ? (
                          <img
                            src={record[column.name]}
                            alt="Firma"
                            className="h-9 w-auto max-w-[140px] rounded border border-slate-200 bg-white object-contain"
                          />
                        ) : (
                          <span className="text-slate-400">Sin firma</span>
                        )
                      ) : (
                        <span className={`block truncate ${column.type === 'boolean' ? (record[column.name] ? 'font-semibold text-emerald-700' : 'text-red-600') : ''}`} title={formatValue(record[column.name], column.type)}>
                          {formatValue(record[column.name], column.type)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(record.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#1e2b66] transition hover:border-[#1e2b66]/30 hover:bg-[#1e2b66]/5"
                        title="Editar registro"
                        aria-label={`Editar registro ${record.id}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(record.id)}
                        disabled={deletingId === record.id}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Eliminar registro"
                        aria-label={`Eliminar registro ${record.id}`}
                      >
                        {deletingId === record.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length > pageSize && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredRecords.length}
              onPageChange={(p) => setPage(p)}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          )}
        </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Eliminar registro"
        description="¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId !== null) {
            handleDelete(confirmDeleteId);
          }
        }}
        isLoading={deletingId !== null}
      />
    </div>
  );
};

export default RecordTable;
