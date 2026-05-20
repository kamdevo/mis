import React, { useEffect, useState } from 'react';
import { usersService, CreateUserData, UpdateUserData } from '../../lib/usersService';
import { User, UpdateUserPermissionsData } from '../../lib/usersService';
import { useAuth } from '../../providers/AuthContext';
import CreateUserModal from './modals/CreateUserModal';
import EditUserModal from './modals/EditUserModal';
import DeleteUserModal from './modals/DeleteUserModal';
import { UserFormData } from './types/types';
import { useToast } from '../../providers/ToastContext';
import { getNotificationCopy, NotificationKey } from '../../constants/notifications';
import Pagination from '../ui/Pagination';

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

  const { hasRole } = useAuth();
  const { success, error: toastError } = useToast();

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
    'editor': 'Editor'
  };

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
      const copy = emitUserToast('error', 'createError');
      throw new Error(copy.title);
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

      // @ts-ignore - document_permissions might not be in UserFormData but handled in backend or separate call if implemented
      const updatedUser = await usersService.updateUser(editingUser.id, updateData);
      setUsers(prev => prev.map(user => user.id === editingUser.id ? updatedUser : user));
      closeModals();
      emitUserToast('success', 'updateSuccess');
    } catch (err: any) {
      const copy = emitUserToast('error', 'updateError');
      throw new Error(copy.title);
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

  const getDisplayRole = (rol: string): string => {
    return roleNames[rol] || rol;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-800 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Gestión de Usuarios</h2>
              <p className="text-blue-200 text-sm mt-1">Sistema MIS - Banco de Sangre</p>
            </div>
            {hasRole('admin') && (
              <button
                onClick={openCreateModal}
                className="mt-3 sm:mt-0 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                <span>Nuevo Usuario</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-gray-50 border-b">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.rol === 'admin').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.18 5 4.05 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.rol === 'user').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                {hasRole('admin') && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.slice((page - 1) * pageSize, page * pageSize).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
                        {getInitials(user.nombre)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getDisplayRole(user.rol)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.telefono}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full border bg-green-100 text-green-800 border-green-200">
                      Activo
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.correo}</td>
                  {hasRole('admin') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="Editar usuario"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                          title="Eliminar usuario"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length > pageSize && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={users.length}
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
