import React, { useState, useEffect } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../providers/ToastContext';
import { getNotificationCopy } from '../../constants/notifications';
import { AlertCircle, ArrowRight, Loader2, LockKeyhole, Mail } from 'lucide-react';

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

    const correo = formData.correo.trim();
    if (!correo || !formData.password) {
      const message = 'Ingresa tu correo y contraseña para continuar.';
      setError(message);
      toastError('Datos incompletos', { description: message });
      return;
    }

    const validEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!validEmailPattern.test(correo)) {
      const message = 'Ingresa un correo electrónico válido.';
      setError(message);
      toastError('Correo inválido', { description: message });
      return;
    }

    setIsLoading(true);

    try {
      await login(correo, formData.password);
      const copy = getNotificationCopy('auth', 'loginSuccess');
      success(copy.title, { description: copy.description });
    } catch (err: any) {
      const copy = getNotificationCopy('auth', 'loginError');
      const message = err instanceof Error ? err.message : copy.description ?? copy.title;
      setError(message);
      toastError(copy.title, { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) setError('');
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-red-700" aria-label="Cargando sesión" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 text-white lg:flex">
        <img
          src="/login.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/78 to-red-950/58" />
        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white p-2 shadow-sm">
              <img src="/logo-hospital.png" alt="Hospital Universitario del Valle" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Hospital Universitario del Valle</p>
              <p className="text-xs font-medium text-white/65">Banco de Sangre</p>
            </div>
          </div>

          <div className="max-w-xl">
            <h1 className="text-4xl font-semibold leading-tight tracking-normal text-white xl:text-5xl">
              Sistema MIS - HUV
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/72">
              Gestión centralizada de documentos, formularios dinámicos y trazabilidad operativa del banco de sangre.
            </p>
          </div>

          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">
            Manejo integral de soluciones
          </p>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200">
              <img src="/logo-hospital.png" alt="Hospital Universitario del Valle" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Sistema MIS - HUV</p>
              <p className="text-xs font-medium text-slate-500">Banco de Sangre</p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Acceso MIS</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">Ingresa a tu cuenta</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Usa tus credenciales institucionales para continuar al panel correspondiente.
            </p>
          </div>

          {error && (
            <div
              id="login-error"
              role="alert"
              className="mb-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="correo" className="mb-2 block text-sm font-medium text-slate-800">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="correo"
                  name="correo"
                  type="email"
                  autoComplete="email"
                  value={formData.correo}
                  onChange={handleChange}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  placeholder="usuario@huv.gov.co"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-800">
                Contraseña
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'login-error' : undefined}
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  placeholder="Ingresa tu contraseña"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando acceso
                </>
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
            Acceso reservado al personal autorizado del Hospital Universitario del Valle.
          </p>
        </div>
      </main>
    </div>
  );
}
