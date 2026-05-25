import React, { useState, useEffect } from 'react';
import { formsService, FormRecord } from '@/lib/formService';
import { useAuth } from '@/providers/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, Plus, FileText } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/providers/ToastContext';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface UserRecordsTableProps {
  form: any;
  documentId: number;
}

const UserRecordsTable: React.FC<UserRecordsTableProps> = ({ form, documentId }) => {
  const [records, setRecords] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const { success, error: toastError } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const hasPermission = (permission: 'view' | 'edit' | 'delete'): boolean => {
    if (!user) return false;
    if (user.rol === 'super-admin' || user.rol === 'admin') return true;
    
    // Check granular permissions first
    const perm = user.document_permissions?.find(p => p.document_id === Number(documentId));
    
    if (perm) {
      if (permission === 'view') return perm.can_view || perm.can_edit || perm.can_delete; // If can edit/delete, usually can view
      if (permission === 'edit') return perm.can_edit;
      if (permission === 'delete') return perm.can_delete;
    }

    // Fallback based on roles if no specific permissions (though permissions should be primary source now)
    if (user.rol === 'editor') {
      return permission === 'view' || permission === 'edit';
    }
    
    return permission === 'view';
  };

  useEffect(() => {
    loadRecords();
  }, [documentId]);

  const loadRecords = async () => {
    if (!documentId) return; // Guard clause
    try {
      setLoading(true);
      const response = await formsService.getFormRecords(documentId);
      const recordsArray = formsService.normalizeRecordsResponse(response);
      setRecords(recordsArray);
      // success('Registros cargados'); // Optional: too noisy on load
    } catch (err: any) {
      setError('Error al cargar registros: ' + err.message);
      toastError(err.message || 'Error al cargar registros');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecord = (recordId: number) => {
    navigate(`/dashboard-users/documents/${documentId}/${recordId}`);
  };

  const handleCreateRecord = () => {
    navigate(`/dashboard-users/documents/${documentId}/new`);
  };

  const handleDeleteRecord = async (recordId: number) => {
    try {
      setConfirmDeleteId(recordId); // Keep ID for modal, but actual deletion logic is below
      await formsService.deleteFormRecord(documentId, recordId);
      loadRecords();
      success('Registro eliminado');
    } catch (err: any) {
      setError('Error al eliminar registro: ' + err.message);
      toastError(err.message || 'Error al eliminar registro');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Registros</h3>
          <p className="text-sm text-gray-600">
            {records.length} registro{records.length !== 1 ? 's' : ''} encontrado{records.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {hasPermission('edit') && (
            <button
                onClick={handleCreateRecord}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
                <Plus className="w-4 h-4" />
                <span>Nuevo Registro</span>
            </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              {form.columns_config.slice(0, 3).map((column: any) => (
                <th key={column.name} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column.label}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.slice((page - 1) * pageSize, page * pageSize).map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  #{record.id}
                </td>
                {form.columns_config.slice(0, 3).map((column: any) => (
                  <td key={column.name} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.type === 'signature' ? (
                      record[column.name] ? (
                        <img
                          src={record[column.name]}
                          alt="Firma"
                          className="h-9 w-auto max-w-[140px] rounded border border-gray-200 bg-white object-contain"
                        />
                      ) : (
                        <span className="text-gray-400">Sin firma</span>
                      )
                    ) : (
                      <span className="block max-w-[260px] truncate" title={String(record[column.name] ?? '')}>
                        {record[column.name] || '-'}
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleViewRecord(record.id)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Ver registro"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {hasPermission('edit') && (
                      <button
                          onClick={() => handleViewRecord(record.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Editar registro"
                      >
                          <Edit className="w-4 h-4" />
                      </button>
                  )}
                  
                  {hasPermission('delete') && (
                      <button
                          onClick={() => setConfirmDeleteId(record.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar registro"
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {records.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros</h3>
            <p className="text-gray-500">
                Crea el primer registro para este documento
            </p>
          </div>
        )}
        {records.length > pageSize && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={records.length}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="Eliminar registro"
        description="¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId !== null) {
            handleDeleteRecord(confirmDeleteId).finally(() => setConfirmDeleteId(null));
          }
        }}
      />
    </div>
  );
};

export default UserRecordsTable;
