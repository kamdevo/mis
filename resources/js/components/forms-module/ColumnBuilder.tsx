// components/forms/ColumnBuilder.tsx
import React, { useState } from 'react';
import { FormColumn, COLUMN_TYPES } from './types/types';
import { getColumnIcon } from '@/components/ui/ColumnIcons';

interface ColumnBuilderProps {
  columns: FormColumn[];
  onChange: (columns: FormColumn[]) => void;
}

const ColumnBuilder: React.FC<ColumnBuilderProps> = ({ columns, onChange }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [optionDrafts, setOptionDrafts] = useState<Record<number, string>>({});

  const parseOptions = (text: string) =>
    text
    .split(/[,\n]/)
      .map(option => option.trim())
      .filter(Boolean);

  const addColumn = () => {
    const newColumn: FormColumn = {
      name: '',
      type: 'string',
      label: '',
      required: false
    };
    onChange([...columns, newColumn]);
    setExpandedIndex(columns.length);
  };

  const updateColumn = (index: number, updates: Partial<FormColumn>) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], ...updates };
    
    // Si cambia el tipo, limpiar opciones si no es enum
    if (updates.type && updates.type !== 'enum') {
      delete updated[index].options;
    }
    
    onChange(updated);
  };

  const removeColumn = (index: number) => {
    onChange(columns.filter((_, i) => i !== index));
    if (expandedIndex === index) setExpandedIndex(null);
    setOptionDrafts((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const draftIndex = Number(key);
        if (draftIndex < index) next[draftIndex] = value;
        if (draftIndex > index) next[draftIndex - 1] = value;
      });
      return next;
    });
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    
    const updated = [...columns];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
    setOptionDrafts((prev) => {
      const next = { ...prev };
      next[index] = prev[newIndex] ?? columns[newIndex]?.options?.join(', ') ?? '';
      next[newIndex] = prev[index] ?? columns[index]?.options?.join(', ') ?? '';
      return next;
    });
  };

  const generateFieldName = (label: string): string => {
    return label
      .toLowerCase()
      .normalize('NFD') // Descompone caracteres con acentos
      .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos
      .replace(/[^a-z0-9]+/g, '_') // Reemplaza no alfanuméricos con _
      .replace(/^_|_$/g, ''); // Elimina _ al inicio o final
  };

  const getTypeInfo = (type: string) => {
    return COLUMN_TYPES.find(t => t.value === type) || COLUMN_TYPES[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Estructura del Formulario
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {columns.length === 0 ? 'Agrega campos para comenzar' : `${columns.length} campo${columns.length !== 1 ? 's' : ''} configurado${columns.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={addColumn}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>Agregar Campo</span>
        </button>
      </div>

      {columns.length === 0 && (
        <div className="text-center py-16 px-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Sin campos definidos</h4>
          <p className="text-sm text-gray-600 max-w-sm mx-auto">
            Comienza agregando campos para construir tu formulario personalizado
          </p>
        </div>
      )}

      <div className="space-y-4">
        {columns.map((column, index) => {
          const typeInfo = getTypeInfo(column.type);
          const isExpanded = expandedIndex === index;
          const hasError = !column.label || !column.name || (column.type === 'enum' && (!column.options || column.options.length === 0));

          return (
            <div
              key={index}
              className={`bg-white rounded-xl border-2 transition-all ${
                hasError ? 'border-red-300 shadow-sm' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              {/* Header compacto */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700">
                      {getColumnIcon(column.type, "w-5 h-5")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-500">
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {column.label || 'Campo sin nombre'}
                        </h4>
                        {column.required && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            Requerido
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {typeInfo.label} {column.name && `• ${column.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={isExpanded ? "Contraer" : "Expandir"}
                    >
                      <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(index, 'up')}
                      disabled={index === 0}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Mover arriba"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(index, 'down')}
                      disabled={index === columns.length - 1}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Mover abajo"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar campo"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenido expandible */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Etiqueta visible <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={column.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          const generatedName = generateFieldName(label);
                          updateColumn(index, { 
                            label,
                            name: generatedName
                          });
                        }}
                        placeholder="ej: Fecha de Donación"
                        className="w-full text-black px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">Lo que verá el usuario</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Nombre técnico <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={column.name}
                        onChange={(e) => updateColumn(index, { name: e.target.value })}
                        placeholder="ej: fecha_donacion"
                        className="w-full px-3 text-black py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">snake_case, sin espacios</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Tipo de dato <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={column.type}
                        onChange={(e) => updateColumn(index, { type: e.target.value as FormColumn['type'] })}
                        className="w-full text-black px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        {COLUMN_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">{typeInfo.description}</p>
                    </div>

                    <div className="flex flex-col justify-center">
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={column.required}
                          onChange={(e) => updateColumn(index, { required: e.target.checked })}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            Campo obligatorio
                          </span>
                          <p className="text-xs text-gray-500">El usuario debe completarlo</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {column.type === 'enum' && (
                    <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opciones disponibles <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={optionDrafts[index] ?? column.options?.join(', ') ?? ''}
                        onChange={(e) => {
                          const text = e.target.value;
                          const options = parseOptions(text);
                          setOptionDrafts(prev => ({ ...prev, [index]: text }));
                          updateColumn(index, { options });
                        }}
                        placeholder="ej: A+, A-, B+, B-, AB+, AB-, O+, O-"
                        rows={2}
                        className="w-full text-black px-3 py-2.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                      />
                      {column.options && column.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {column.options.map((opt, i) => (
                            <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-600 mt-2">Separa las opciones con comas</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ColumnBuilder;
