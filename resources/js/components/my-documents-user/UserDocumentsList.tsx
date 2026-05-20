import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, FileText, Info, Loader2, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import axios from 'axios';

interface UserDocument {
  id: number;
  name: string;
  slug: string;
  description?: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  is_admin?: boolean;
}

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: 'navy' | 'slate' | 'red';
}

const StatTile: React.FC<StatTileProps> = ({ label, value, icon: Icon, tone }) => {
  const toneClassName = {
    navy: 'bg-[#1e2b66]/10 text-[#1e2b66]',
    slate: 'bg-slate-100 text-slate-600',
    red: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const PermissionChip: React.FC<{ label: string; granted: boolean }> = ({ label, granted }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
      granted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
    }`}
  >
    {granted ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
    {label}
  </span>
);

const UserDocumentsList: React.FC = () => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadUserDocuments();
  }, []);

  const loadUserDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/my-documents');
      if (response.data.success) {
        setDocuments(response.data.data);
      } else {
        // Si la respuesta es directamente el arreglo (según la implementación del backend)
        setDocuments(Array.isArray(response.data) ? response.data : response.data.data || []);
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.message || err.message || 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (document: UserDocument) => {
    if (!document.can_view) return;
    navigate(`/dashboard-users/documents/${document.id}`);
  };

  const handleCreateRecord = (document: UserDocument) => {
    if (!document.can_edit) return;
    navigate(`/dashboard-users/documents/${document.id}/new`);
  };

  const getInitials = (name: string): string =>
    name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);

  const viewableCount = documents.filter((doc) => doc.can_view).length;
  const editableCount = documents.filter((doc) => doc.can_edit).length;
  const deletableCount = documents.filter((doc) => doc.can_delete).length;

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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="h-1 w-full bg-[#1e2b66]" />
        <div className="flex flex-col gap-5 px-5 py-5 lg:flex-row lg:items-start lg:justify-between lg:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Documentos</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950 lg:text-3xl">Mis documentos</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {currentUser?.rol === 'admin'
                ? 'Acceso completo a todos los documentos del sistema MIS.'
                : 'Accede a los documentos asignados a tu usuario y consulta sus permisos.'}
            </p>
          </div>
          <span className="inline-flex h-fit w-fit items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <FileText className="h-3.5 w-3.5" />
            {documents.length} documento{documents.length !== 1 ? 's' : ''}
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total" value={documents.length} icon={FileText} tone="navy" />
        <StatTile label="Pueden ver" value={viewableCount} icon={Eye} tone="navy" />
        <StatTile label="Pueden editar" value={editableCount} icon={Pencil} tone="slate" />
        <StatTile label="Pueden eliminar" value={deletableCount} icon={Trash2} tone="red" />
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {documents.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-950">No tienes documentos asignados</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              {currentUser?.rol === 'admin'
                ? 'No hay documentos creados en el sistema.'
                : 'Contacta al administrador para que te asigne documentos.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Documento
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Permisos
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {documents.map((document) => (
                  <tr
                    key={document.id}
                    className={`transition-colors hover:bg-slate-50/80 ${document.can_view ? '' : 'opacity-60'}`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66] text-sm font-semibold text-white shadow-sm">
                          {getInitials(document.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{document.name}</p>
                          <p className="mt-1 truncate font-mono text-xs text-slate-500">/{document.slug}</p>
                          {document.description && (
                            <p className="mt-0.5 max-w-[320px] truncate text-xs text-slate-500">
                              {document.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {document.is_admin ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1e2b66]/10 px-2.5 py-1 text-xs font-semibold text-[#1e2b66]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Acceso completo
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          <PermissionChip label="Ver" granted={document.can_view} />
                          <PermissionChip label="Editar" granted={document.can_edit} />
                          <PermissionChip label="Eliminar" granted={document.can_delete} />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDocument(document)}
                          disabled={!document.can_view}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#1e2b66] transition hover:border-[#1e2b66]/30 hover:bg-[#1e2b66]/5 disabled:cursor-not-allowed disabled:opacity-40"
                          title={document.can_view ? 'Ver documento' : 'Sin permiso de visualización'}
                          aria-label={`Ver ${document.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {document.can_edit && (
                          <button
                            type="button"
                            onClick={() => handleCreateRecord(document)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1e2b66] px-3 text-xs font-semibold text-white transition hover:bg-[#172252]"
                            title="Crear registro"
                            aria-label={`Crear registro en ${document.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Crear
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

      {currentUser?.rol !== 'admin' && documents.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Información de accesos</p>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                <li>Solo puedes ver y trabajar con los documentos asignados a tu usuario.</li>
                <li>Los permisos (ver, editar, eliminar) los configura el administrador.</li>
                <li>Si necesitas acceso a más documentos, contacta al administrador del sistema.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDocumentsList;
