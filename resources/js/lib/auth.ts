import axios from 'axios';

export interface User {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  rol: 'admin' | 'user' | 'editor' | 'super-admin';
  document_permissions?: DocumentPermission[];
}

export interface DocumentPermission {
  document_id: number;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

interface LoginErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

class AuthService {
  async login(correo: string, password: string): Promise<AuthResponse> {
    try {
        await axios.get('/sanctum/csrf-cookie').catch(() => {});

        const response = await axios.post<AuthResponse | LoginErrorResponse>(
          '/api/login',
          { correo, password },
          { validateStatus: (status) => status < 500 }
        );

        if (response.status >= 400) {
          const data = response.data as LoginErrorResponse;
          const firstFieldError = data.errors ? Object.values(data.errors).flat()[0] : undefined;
          throw new Error(firstFieldError || data.message || 'No pudimos iniciar sesión.');
        }

        return response.data as AuthResponse;
    } catch (error: any) {
        if (error instanceof Error) throw error;
        throw new Error(error.response?.data?.message || 'Error en el login');
    }
  }

  async logout(token: string | null): Promise<void> {
    if (!token) return;
    try {
        await axios.post('/api/logout', {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (error) {
        console.error('Logout error', error);
    }
  }

  async getCurrentUser(token: string): Promise<User> {
    try {
        const response = await axios.get('/api/user', {
             headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.user || response.data; // Adjust depending on if wrapped
    } catch (error) {
        throw new Error('Error obteniendo usuario');
    }
  }
}

export const authService = new AuthService();
