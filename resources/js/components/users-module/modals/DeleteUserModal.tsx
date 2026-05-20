import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { DeleteUserModalProps } from '../types/types';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  user: 'Usuario regular',
  editor: 'Editor',
  'super-admin': 'Super administrador',
};

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  user,
  onConfirm,
  onClose,
  isLoading = false,
}) => {
  const [confirmInput, setConfirmInput] = useState('');

  useEffect(() => {
    if (isOpen) setConfirmInput('');
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  const getInitials = (name?: string | null): string => {
    if (!name) return '?';

    const trimmed = name.trim();
    if (!trimmed) return '?';

    return trimmed
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const handleConfirm = async () => {
    if (!user || confirmInput !== 'ELIMINAR') return;
    await onConfirm(user.id);
    setConfirmInput('');
  };

  const handleRequestClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && user && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={handleRequestClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full overflow-hidden bg-white shadow-2xl sm:max-w-xl sm:rounded-lg sm:border sm:border-slate-200"
            initial={{ opacity: 0, y: 28, scale: 0.98, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 22, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.8 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="border-b border-red-100 bg-white">
              <div className="h-1 bg-red-700" />
              <div className="flex items-start justify-between gap-4 px-5 py-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">Accion irreversible</p>
                    <h2 id="delete-user-title" className="mt-1 text-xl font-semibold text-slate-950">Eliminar usuario</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Esta accion retirara el acceso del usuario al sistema MIS.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                  aria-label="Cerrar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="space-y-5 px-5 py-5">
              <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66] text-lg font-semibold text-white">
                  {getInitials(user.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-950">{user.nombre}</p>
                  <p className="truncate text-sm text-slate-600">{user.correo}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{roleLabels[user.rol] || user.rol}</p>
                </div>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-semibold">El usuario perdera acceso inmediatamente.</p>
                <p className="mt-1 leading-6">Confirma solo si ya verificaste que la cuenta no debe permanecer activa.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Escribe <span className="text-red-700">ELIMINAR</span> para confirmar
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(event) => setConfirmInput(event.target.value)}
                  placeholder="ELIMINAR"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-600 focus:ring-4 focus:ring-red-100 disabled:bg-slate-100 disabled:text-slate-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <footer className="border-t border-slate-200 bg-white px-5 py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading || confirmInput !== 'ELIMINAR'}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Eliminar usuario
                    </>
                  )}
                </button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeleteUserModal;
