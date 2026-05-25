// modules/admin/DocumentRecordForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { formsService } from '@/lib/formService';
import DynamicRecordForm from '@/components/forms-module/DynamicRecordForm';
import type { DynamicForm } from '@/lib/formService';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

const DocumentRecordFormPage = () => {
  const navigate = useNavigate();
  const { id: formId, recordId } = useParams<{ id: string; recordId: string }>();

  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (formId) {
      loadForm(parseInt(formId, 10));
    } else {
      setError('ID de documento no válido');
        setLoading(false);
    }
  }, [formId]);

  const loadForm = async (fId: number) => {
    try {
      setLoading(true);
      setError('');
      
      const formData = await formsService.getFormById(fId);
      
      setForm(formData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar formulario');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (formId) {
      navigate(`/dashboard-admin/documents/${formId}`);
    } else {
      navigate('/dashboard-admin/documents');
    }
  };

  // Estado de carga inicial
  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <DashboardLayout>
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-600">
              <Loader2 className="h-10 w-10 animate-spin text-[#1e2b66]" />
              <p className="text-sm font-medium">Cargando registro...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // Estado de error
  if (error || !form) {
    return (
      <ProtectedRoute requiredRole="admin">
        <DashboardLayout>
          <div className="rounded-lg border border-red-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">Error al cargar</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {error || 'No se pudo encontrar el documento'}
              </p>
              <button
                onClick={handleBack}
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e2b66] px-4 text-sm font-semibold text-white transition hover:bg-[#172252]"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  // Determinar si es crear o editar
  const isCreating = recordId === 'new' || !recordId;
  const numericRecordId = isCreating ? null : parseInt(recordId as string, 10);
  
  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardLayout>
        <div className="mb-5">
          <button
            onClick={handleBack}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a registros
          </button>
        </div>

        <DynamicRecordForm 
          form={form}
          documentId={form.id}
          recordId={numericRecordId}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default DocumentRecordFormPage;
