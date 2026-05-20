import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../providers/ToastContext';
import { getNotificationCopy } from '../../constants/notifications';

export function Login() {
  const [formData, setFormData] = useState({
    correo: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (isAuthenticated && user) {
      redirectByRole(user.rol);
    }
  }, [isAuthenticated, user]);

  const redirectByRole = (rol: string) => {
    if (rol === 'super-admin') {
      navigate('/dashboard-superadmin');
    } else if (rol === 'admin') {
      navigate('/dashboard-admin');
    } else {
      navigate('/dashboard-users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData.correo, formData.password);
      const copy = getNotificationCopy('auth', 'loginSuccess');
      success(copy.title, { description: copy.description });
    } catch (err: any) {
      const copy = getNotificationCopy('auth', 'loginError');
      setError(copy.description ?? copy.title);
      toastError(copy.title, { description: copy.description });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left side - Image */}
      <div
        className="lg:w-1/2 relative bg-cover bg-center bg-no-repeat min-h-[40vh] lg:min-h-screen"
        style={{ backgroundImage: "url('/login.svg')" }}
      >
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="bg-[#FAFAFA] shadow-2xl p-10 rounded-2xl">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <div className="mb-6">
                <div className="size-28 mx-auto flex items-center justify-center shadow-sm rounded-2xl">
                  <img src="/logo-hospital.png" alt="" />
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Sistema MIS - HUV
              </h1>
              <p className="text-slate-500 text-sm mb-8">
                MANEJO INTEGRAL DE SOLUCIONES EN BANCO DE SANGRE
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <input
                    id="correo"
                    name="correo"
                    type="email"
                    required
                    value={formData.correo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="usuario@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
              >
                {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
