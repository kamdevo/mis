import { User } from '../../../lib/usersService';

export type UserStatus = 'Activo' | 'Inactivo';
export type UserRole = 'admin' | 'user' | 'editor' | 'super-admin';

export interface UserFormData {
  nombre: string;
  correo: string;
  password: string;
  telefono: string;
  rol: UserRole;
  status?: UserStatus;
  document_permissions?: DocumentPermission[];
}

export interface DocumentPermission {
  document_id: number;
  document_name: string;
  document_slug: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_review?: boolean;
}

export interface CreateUserModalProps {
  isOpen: boolean;
  onSubmit: (data: UserFormData) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export interface EditUserModalProps {
  isOpen: boolean;
  user: User | null;
  onSubmit: (data: UserFormData) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export interface DeleteUserModalProps {
  isOpen: boolean;
  user: User | null;
  onConfirm: (userId: number) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}
