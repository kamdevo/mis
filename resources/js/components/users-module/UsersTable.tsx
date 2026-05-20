import React, { useEffect, useMemo, useState } from 'react';
import { usersService, CreateUserData, UpdateUserData } from '../../lib/usersService';
import { User } from '../../lib/usersService';
import { useAuth } from '../../providers/AuthContext';
import CreateUserModal from './modals/CreateUserModal';
import EditUserModal from './modals/EditUserModal';
import DeleteUserModal from './modals/DeleteUserModal';
import { UserFormData } from './types/types';
import { useToast } from '../../providers/ToastContext';
import { getNotificationCopy, NotificationKey } from '../../constants/notifications';
import Pagination from '../ui/Pagination';
import {
  AlertCircle,
  Edit3,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';

const UsersTable: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState('');

  const { hasRole } = useAuth();
  const { success, error: toastError } = useToast();
  const canManage = hasRole('admin');

  const emitUserToast = (variant: 'success' | 'error', key: NotificationKey<'users'>) => {
    const copy = getNotificationCopy('users', key);
    const handler = variant === 'success' ? success : toastError;
    handler(copy.title, { description: copy.description });
    if (variant === 'error') {
      setError(copy.description ?? copy.title);
    } else {
      setError('');
    }
    return copy;
  };

  const roleNames: { [key: string]: string } = {
    'admin': 'Administrador',
    'user': 'Usuario Regular',
    'editor': 'Editor',
    'super-admin': 'Super administrador',
  };

  const getDisplayRole = (rol: string): string => {
    return roleNames[rol] || rol;
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => [user.nombre, user.correo, user.telefono, getDisplayRole(user.rol)]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term))
    );
  }, [users, searchTerm]);

  const paginatedUsers = useMemo(
    () => filteredUsers.slice((page - 1) * pageSize, page * pageSize),
    [filteredUsers, page, pageSize]
  );

  const userStats = useMemo(() => ({
    total: users.length,
    admins: users.filter(user => user.rol === 'admin' || user.rol === 'super-admin').length,
    editors: users.filter(user => user.rol === 'editor').length,
    regular: users.filter(user => user.rol === 'user').length,
  }), [users]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await usersService.getAllUsers();
      setUsers(usersData);
      setError('');
    } catch (err) {
      emitUserToast('error', 'loadError');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (formData: UserFormData) => {
    setActionLoading(true);
    setError('');

    try {
      const newUser = await usersService.createUser(formData as CreateUserData);
      setUsers(prev => [...prev, newUser]);
      closeModals();
      emitUserToast('success', 'createSuccess');
    } catch (err: any) {
      const copy = getNotificationCopy('users', 'createError');
      const message = err?.message || copy.description || copy.title;
      setError(message);
      toastError(copy.title, { description: message });
      throw new Error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (formData: UserFormData) => {
    if (!editingUser) return;

    setActionLoading(true);
    setError('');

    try {
      const updateData: UpdateUserData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }

      const updatedUser = await usersService.updateUser(editingUser.id, updateData);
      setUsers(prev => prev.map(user => user.id === editingUser.id ? updatedUser : user));
      closeModals();
      emitUserToast('success', 'updateSuccess');
    } catch (err: any) {
      const copy = getNotificationCopy('users', 'updateError');
      const message = err?.message || copy.description || copy.title;
      setError(message);
      toastError(copy.title, { description: message });
      throw new Error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async (userId: number) => {
    setActionLoading(true);
    setError('');

    try {
      await usersService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
      closeModals();
      emitUserToast('success', 'deleteSuccess');
    } catch (err) {
      const copy = emitUserToast('error', 'deleteError');
      throw new Error(copy.title);
    } finally {
      setActionLoading(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
  };

  const openEditModal = async (user: User) => {
    try {
      // Fetch fresh user data with permissions
      const userDetails = await usersService.getUserById(user.id);
      setEditingUser(userDetails);
      setShowEditModal(true);
    } catch (err) {
      emitUserToast('error', 'loadError');
    }
  };

  const openDeleteModal = (user: User) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setEditingUser(null);
    setDeletingUser(null);
    setError('');
  };

  const getInitials = (name?: string | null): string => {
    if (!name) return '?';

    const trimmed = name.trim();
    if (!trimmed) return '?';

    const initials = trimmed
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase();

    return initials.slice(0, 2) || '?';
  };

  const getRoleClassName = (rol: string): string => {
    if (rol === 'admin' || rol === 'super-admin') return 'bg-red-50 text-red-700 border-red-200';
    if (rol === 'editor') return 'bg-[#1e2b66]/10 text-[#1e2b66] border-[#1e2b66]/20';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-600">
          <Loader2 className="h-10 w-10 animate-spin text-[#1e2b66]" />
          <p className="text-sm font-medium">Cargando usuarios...</p>
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e2b66]">Usuarios</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 lg:text-3xl">
                  Gestión de usuarios
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Administra accesos, roles y permisos documentales del equipo del Banco de Sangre.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e2b66] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/20"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo usuario
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 border-b border-slate-200 sm:grid-cols-4">
            <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{userStats.total}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                  <Users className="h-5 w-5" />
                </span>
              </div>
            </div>

            <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Administradores</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{userStats.admins}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 text-red-700">
                  <ShieldCheck className="h-5 w-5" />
                </span>
              </div>
            </div>

            <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Editores</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{userStats.editors}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <Edit3 className="h-5 w-5" />
                </span>
              </div>
            </div>

            <div className="px-5 py-4 lg:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Usuarios</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{userStats.regular}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <UserCheck className="h-5 w-5" />
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
                placeholder="Buscar por nombre, correo, teléfono o rol"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10"
              />
            </div>

            <button
              type="button"
              onClick={loadUsers}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {filteredUsers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                {users.length === 0 ? 'No hay usuarios registrados' : 'No encontramos usuarios'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                {users.length === 0
                  ? 'Crea el primer usuario para asignarle acceso al sistema MIS.'
                  : 'Ajusta la búsqueda o actualiza la lista para revisar los usuarios disponibles.'}
              </p>
              {canManage && users.length === 0 && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mx-auto mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1e2b66] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252]"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo usuario
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Usuario</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Rol</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Contacto</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Estado</th>
                {canManage && (
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66] text-sm font-semibold text-white shadow-sm">
                        {getInitials(user.nombre)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{user.nombre}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleClassName(user.rol)}`}>
                      {getDisplayRole(user.rol)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="truncate">{user.correo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{user.telefono || 'Sin teléfono'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Activo
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-5 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-[#1e2b66]/10 hover:text-[#1e2b66] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10"
                          title="Editar usuario"
                          aria-label={`Editar ${user.nombre}`}
                        >
                          <Edit3 className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(user)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
                          title="Eliminar usuario"
                          aria-label={`Eliminar ${user.nombre}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          )}
        </section>

        {filteredUsers.length > pageSize && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredUsers.length}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>

      <CreateUserModal
        isOpen={showCreateModal}
        onSubmit={handleCreateUser}
        onClose={closeModals}
        isLoading={actionLoading}
      />

      <EditUserModal
        isOpen={showEditModal}
        user={editingUser}
        onSubmit={handleUpdateUser}
        onClose={closeModals}
        isLoading={actionLoading}
      />

      <DeleteUserModal
        isOpen={showDeleteModal}
        user={deletingUser}
        onConfirm={handleDeleteConfirm}
        onClose={closeModals}
        isLoading={actionLoading}
      />
    </>
  );
};

export default UsersTable;
