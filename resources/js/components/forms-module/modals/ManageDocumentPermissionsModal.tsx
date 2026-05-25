import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Check, FileText, Loader2, Save, Search, ShieldCheck, Trash2, UserRound, Users, X } from 'lucide-react';
import { useToast } from '@/providers/ToastContext';

interface UserPermission {
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_review: boolean;
}

interface UserBasic {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
}

interface ManageDocumentPermissionsModalProps {
  show: boolean;
  onClose: () => void;
  formId: number;
  formName: string;
}

type PermissionField = 'can_view' | 'can_edit' | 'can_delete' | 'can_review';

const permissionColumns: Array<{ key: PermissionField; label: string; tone: 'blue' | 'red' }> = [
  { key: 'can_view', label: 'Ver', tone: 'blue' },
  { key: 'can_edit', label: 'Editar', tone: 'blue' },
  { key: 'can_delete', label: 'Eliminar', tone: 'red' },
  { key: 'can_review', label: 'Revisor', tone: 'blue' },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  'super-admin': 'Super admin',
  editor: 'Editor',
  user: 'Usuario',
};

const normalizeBoolean = (value: unknown): boolean => value === true || value === 1 || value === '1' || value === 'true';

const hasAnyPermission = (permission: UserPermission): boolean => (
  permission.can_view || permission.can_edit || permission.can_delete || permission.can_review
);

const getRoleLabel = (role: string): string => roleLabels[role] ?? role;

const PermissionCheckbox: React.FC<{
  label: string;
  checked: boolean;
  disabled?: boolean;
  tone?: 'blue' | 'red';
  onChange: (checked: boolean) => void;
}> = ({ label, checked, disabled = false, tone = 'blue', onChange }) => {
  const activeClass = tone === 'red' ? 'border-red-600 bg-red-600 text-white' : 'border-[#1e2b66] bg-[#1e2b66] text-white';

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-[#1e2b66]/30 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? activeClass : 'border-slate-300 bg-white text-transparent hover:border-[#1e2b66] hover:bg-slate-50'
      }`}
      title={label}
    >
      <Check className="h-4 w-4" />
    </button>
  );
};

const ManageDocumentPermissionsModal: React.FC<ManageDocumentPermissionsModalProps> = ({
  show,
  onClose,
  formId,
  formName,
}) => {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadError, setLoadError] = useState('');
  const { success, error } = useToast();

  useEffect(() => {
    if (!show) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, saving, onClose]);

  useEffect(() => {
    if (show && formId) loadData();
  }, [show, formId]);

  const loadData = async () => {
    setLoading(true);
    setLoadError('');

    try {
      const [permissionsRes, usersRes] = await Promise.all([
        axios.get(`/api/forms/${formId}/permissions`),
        axios.get('/api/users'),
      ]);

      const assignedPermissions: UserPermission[] = Array.isArray(permissionsRes.data?.data) ? permissionsRes.data.data : [];
      const users: UserBasic[] = Array.isArray(usersRes.data) ? usersRes.data : [];
      const permissionsByUser = new Map(assignedPermissions.map((permission) => [permission.user_id, permission]));

      setPermissions(users.map((user) => {
        const assigned = permissionsByUser.get(user.id);

        return {
          user_id: user.id,
          user_name: user.nombre,
          user_email: user.correo,
          user_role: user.rol,
          can_view: normalizeBoolean(assigned?.can_view),
          can_edit: normalizeBoolean(assigned?.can_edit),
          can_delete: normalizeBoolean(assigned?.can_delete),
          can_review: normalizeBoolean(assigned?.can_review),
        };
      }));
    } catch (err) {
      setLoadError('No se pudieron cargar los permisos.');
      error('Error', { description: 'No se pudieron cargar los permisos.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredPermissions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return permissions;

    return permissions.filter((permission) => (
      permission.user_name.toLowerCase().includes(term)
      || permission.user_email.toLowerCase().includes(term)
      || getRoleLabel(permission.user_role).toLowerCase().includes(term)
    ));
  }, [permissions, searchTerm]);

  const stats = useMemo(() => ({
    users: permissions.length,
    assigned: permissions.filter(hasAnyPermission).length,
    reviewers: permissions.filter((permission) => permission.can_review).length,
  }), [permissions]);

  const handlePermissionChange = (userId: number, field: PermissionField, value: boolean) => {
    setPermissions((currentPermissions) => currentPermissions.map((permission) => {
      if (permission.user_id !== userId) return permission;

      const nextPermission = { ...permission, [field]: value };

      if (field === 'can_view' && !value) {
        nextPermission.can_edit = false;
        nextPermission.can_delete = false;
        nextPermission.can_review = false;
      }

      if (field === 'can_edit') {
        if (value) nextPermission.can_view = true;
        if (!value) nextPermission.can_delete = false;
      }

      if (field === 'can_delete' && value) {
        nextPermission.can_view = true;
        nextPermission.can_edit = true;
      }

      if (field === 'can_review' && value) {
        nextPermission.can_view = true;
      }

      return nextPermission;
    }));
  };

  const handleClearUser = (userId: number) => {
    setPermissions((currentPermissions) => currentPermissions.map((permission) => (
      permission.user_id === userId
        ? { ...permission, can_view: false, can_edit: false, can_delete: false, can_review: false }
        : permission
    )));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const payload = permissions.map((permission) => ({
        user_id: permission.user_id,
        can_view: permission.can_view,
        can_edit: permission.can_edit,
        can_delete: permission.can_delete,
        can_review: permission.can_review,
      }));

      const response = await axios.post(`/api/forms/${formId}/permissions`, { permissions: payload });
      const updatedPermissions: UserPermission[] = Array.isArray(response.data?.data) ? response.data.data : [];
      const updatedByUser = new Map(updatedPermissions.map((permission) => [permission.user_id, permission]));

      setPermissions((currentPermissions) => currentPermissions.map((permission) => {
        const updated = updatedByUser.get(permission.user_id);

        return {
          ...permission,
          can_view: normalizeBoolean(updated?.can_view),
          can_edit: normalizeBoolean(updated?.can_edit),
          can_delete: normalizeBoolean(updated?.can_delete),
          can_review: normalizeBoolean(updated?.can_review),
        };
      }));

      success('Guardado', { description: 'Permisos actualizados correctamente.' });
      onClose();
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      error('Error', { description: message || 'No se pudieron guardar los permisos.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) onClose();
          }}
        >
          <motion.div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 18, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66] text-white shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Permisos</p>
                    <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">Gestión de permisos</h2>
                    <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-slate-600">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{formName}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Usuarios</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{stats.users}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Con acceso</p>
                  <p className="mt-1 text-2xl font-semibold text-[#1e2b66]">{stats.assigned}</p>
                </div>
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-xs font-medium text-red-700">Revisores</p>
                  <p className="mt-1 text-2xl font-semibold text-red-700">{stats.reviewers}</p>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col bg-slate-50/70">
              <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div className="relative max-w-xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nombre, correo o rol"
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10"
                    disabled={loading || saving}
                  />
                </div>
              </div>

              {loadError && (
                <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{loadError}</span>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-auto px-5 py-4 sm:px-6">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <div className="min-w-[780px]">
                      <div className="grid grid-cols-[minmax(260px,1.5fr)_repeat(4,96px)_64px] items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <div>Usuario</div>
                        {permissionColumns.map((column) => (
                          <div key={column.key} className="text-center">{column.label}</div>
                        ))}
                        <div className="text-center">Limpiar</div>
                      </div>

                      <div className="max-h-[42vh] overflow-y-auto">
                        {loading ? (
                          <div className="flex h-56 items-center justify-center gap-3 text-sm font-medium text-slate-600">
                            <Loader2 className="h-5 w-5 animate-spin text-[#1e2b66]" />
                            Cargando permisos...
                          </div>
                        ) : filteredPermissions.length === 0 ? (
                          <div className="flex h-56 flex-col items-center justify-center gap-3 text-center text-slate-500">
                            <Users className="h-8 w-8 text-slate-300" />
                            <p className="text-sm font-medium">No hay usuarios para mostrar.</p>
                          </div>
                        ) : (
                          filteredPermissions.map((permission) => {
                            const assigned = hasAnyPermission(permission);

                            return (
                              <div
                                key={permission.user_id}
                                className={`grid grid-cols-[minmax(260px,1.5fr)_repeat(4,96px)_64px] items-center gap-3 border-b border-slate-100 px-4 py-3 transition last:border-b-0 ${
                                  assigned ? 'bg-white' : 'bg-white hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${assigned ? 'bg-[#1e2b66] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    <UserRound className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-950">{permission.user_name}</p>
                                    <p className="truncate text-xs text-slate-500">{permission.user_email}</p>
                                    <p className="mt-1 text-xs font-medium text-slate-400">{getRoleLabel(permission.user_role)}</p>
                                  </div>
                                </div>

                                {permissionColumns.map((column) => (
                                  <div key={column.key} className="flex justify-center">
                                    <PermissionCheckbox
                                      label={`${column.label} ${permission.user_name}`}
                                      checked={permission[column.key]}
                                      tone={column.tone}
                                      disabled={saving}
                                      onChange={(checked) => handlePermissionChange(permission.user_id, column.key, checked)}
                                    />
                                  </div>
                                ))}

                                <div className="flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleClearUser(permission.user_id)}
                                    disabled={saving || !assigned}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    title="Limpiar permisos"
                                    aria-label={`Limpiar permisos de ${permission.user_name}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e2b66] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ManageDocumentPermissionsModal;