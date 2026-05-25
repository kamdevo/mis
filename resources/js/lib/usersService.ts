import axios from 'axios';

export interface User {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  rol: 'admin' | 'user' | 'editor' | 'super-admin';
  status?: 'Activo' | 'Inactivo';
  createdAt?: string;
  canAccessDocument?: (documentId: number, permission: string) => boolean;
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

export interface CreateUserData {
  nombre: string;
  correo: string;
  password: string;
  telefono: string;
  rol: 'admin' | 'user' | 'editor' | 'super-admin';
  document_permissions?: DocumentPermission[];
}

export interface UpdateUserData {
  nombre?: string;
  correo?: string;
  password?: string;
  telefono?: string;
  rol?: 'admin' | 'user' | 'editor' | 'super-admin';
  document_permissions?: DocumentPermission[];
}

export interface UpdateUserPermissionsData {
  permissions: DocumentPermission[];
}

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

const getApiErrorMessage = (data: ApiErrorResponse | undefined, fallback: string) => {
  const firstFieldError = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
  return firstFieldError || data?.message || fallback;
};

class UsersService {
  async getAllUsers(): Promise<User[]> {
    const response = await axios.get('/api/users');
    return response.data; // Assuming Laravel Resource Collection or direct array
  }

  async getUserById(id: number): Promise<User> {
    const response = await axios.get(`/api/users/${id}`);
    return response.data;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const response = await axios.post<User | ApiErrorResponse>('/api/users', userData, {
      validateStatus: (status) => status < 500,
    });

    if (response.status >= 400) {
      throw new Error(getApiErrorMessage(response.data as ApiErrorResponse, 'No pudimos crear el usuario.'));
    }

    return response.data as User;
  }

  async updateUser(id: number, userData: UpdateUserData): Promise<User> {
    const response = await axios.put<User | ApiErrorResponse>(`/api/users/${id}`, userData, {
      validateStatus: (status) => status < 500,
    });

    if (response.status >= 400) {
      throw new Error(getApiErrorMessage(response.data as ApiErrorResponse, 'No pudimos actualizar el usuario.'));
    }

    return response.data as User;
  }

  async deleteUser(id: number): Promise<void> {
    await axios.delete(`/api/users/${id}`);
  }

  async getUserDocumentPermissions(userId: number): Promise<DocumentPermission[]> {
    const response = await axios.get(`/api/users/${userId}/document-permissions`);
    return response.data.data || response.data;
  }

  async updateUserDocumentPermissions(userId: number, permissionsData: UpdateUserPermissionsData): Promise<DocumentPermission[]> {
    const response = await axios.post(`/api/users/${userId}/document-permissions`, permissionsData);
    return response.data.data || response.data;
  }

  async deleteUserDocumentPermission(userId: number, documentId: number): Promise<void> {
    await axios.delete(`/api/users/${userId}/document-permissions/${documentId}`);
  }
}

export const usersService = new UsersService();
