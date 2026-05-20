// components/forms/ColumnBuilder.tsx
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronDown, FileText, Plus, Trash2 } from 'lucide-react';
import { FormColumn, COLUMN_TYPES } from './types/types';
import { getColumnIcon } from '@/components/ui/ColumnIcons';

interface ColumnBuilderProps {
  columns: FormColumn[];
  onChange: (columns: FormColumn[]) => void;
}

const ColumnBuilder: React.FC<ColumnBuilderProps> = ({ columns, onChange }) => {
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
    if (expandedIndex === index) setExpandedIndex(newIndex);
    if (expandedIndex === newIndex) setExpandedIndex(index);
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

  const fieldClassName = 'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10';
  const labelClassName = 'mb-2 block text-sm font-semibold text-slate-700';

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Estructura del documento
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {columns.length === 0 ? 'Agrega campos para construir el documento.' : `${columns.length} campo${columns.length !== 1 ? 's' : ''} configurado${columns.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={addColumn}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e2b66] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#172252] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/20"
        >
          <Plus className="h-4 w-4" />
          Agregar campo
        </button>
      </div>

      {columns.length === 0 && (
        <motion.div
          className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
            <FileText className="h-7 w-7" />
          </div>
          <h4 className="mt-4 text-base font-semibold text-slate-950">Sin campos definidos</h4>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
            Agrega el primer campo para configurar la captura de información.
          </p>
        </motion.div>
      )}

      <div className="space-y-3">
        {columns.map((column, index) => {
          const typeInfo = getTypeInfo(column.type);
          const isExpanded = expandedIndex === index;
          const hasError = !column.label || !column.name || (column.type === 'enum' && (!column.options || column.options.length === 0));

          return (
            <motion.div
              key={index}
              layout
              className={`overflow-hidden rounded-lg border bg-white transition ${
                hasError ? 'border-red-200 shadow-sm' : 'border-slate-200 hover:border-[#1e2b66]/35'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1e2b66]/10 text-[#1e2b66]">
                      {getColumnIcon(column.type, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          #{index + 1}
                        </span>
                        <h4 className="truncate text-sm font-semibold text-slate-950">
                          {column.label || 'Campo sin nombre'}
                        </h4>
                        {column.required && (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                            Requerido
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {typeInfo.label} {column.name && `- ${column.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-[#1e2b66]/10 hover:text-[#1e2b66] focus:outline-none focus:ring-4 focus:ring-[#1e2b66]/10"
                      title={isExpanded ? "Contraer" : "Expandir"}
                      aria-label={isExpanded ? `Contraer campo ${index + 1}` : `Expandir campo ${index + 1}`}
                    >
                      <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(index, 'up')}
                      disabled={index === 0}
                      className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 sm:inline-flex"
                      title="Mover arriba"
                      aria-label={`Mover campo ${index + 1} arriba`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(index, 'down')}
                      disabled={index === columns.length - 1}
                      className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 sm:inline-flex"
                      title="Mover abajo"
                      aria-label={`Mover campo ${index + 1} abajo`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
                      title="Eliminar campo"
                      aria-label={`Eliminar campo ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    className="overflow-hidden border-t border-slate-100"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                    <div>
                      <label className={labelClassName}>
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
                        className={fieldClassName}
                      />
                      <p className="mt-1 text-xs text-slate-500">Lo que verá el usuario</p>
                    </div>

                    <div>
                      <label className={labelClassName}>
                        Nombre técnico <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={column.name}
                        onChange={(e) => updateColumn(index, { name: e.target.value })}
                        placeholder="ej: fecha_donacion"
                        className={`${fieldClassName} font-mono`}
                      />
                      <p className="mt-1 text-xs text-slate-500">snake_case, sin espacios</p>
                    </div>

                    <div>
                      <label className={labelClassName}>
                        Tipo de dato <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={column.type}
                        onChange={(e) => updateColumn(index, { type: e.target.value as FormColumn['type'] })}
                        className={fieldClassName}
                      >
                        {COLUMN_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-500">{typeInfo.description}</p>
                    </div>

                    <div className="flex flex-col justify-center">
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-[#1e2b66]/30">
                        <input
                          type="checkbox"
                          checked={column.required}
                          onChange={(e) => updateColumn(index, { required: e.target.checked })}
                          className="h-5 w-5 cursor-pointer rounded border-slate-300 text-[#1e2b66] focus:ring-[#1e2b66]"
                        />
                        <div>
                          <span className="text-sm font-semibold text-slate-800">
                            Campo obligatorio
                          </span>
                          <p className="text-xs text-slate-500">El usuario debe completarlo</p>
                        </div>
                      </label>
                    </div>


                  {column.type === 'enum' && (
                    <div className="md:col-span-2 rounded-lg border border-[#1e2b66]/15 bg-[#1e2b66]/5 p-4">
                      <label className={labelClassName}>
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
                        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#1e2b66] focus:ring-4 focus:ring-[#1e2b66]/10"
                      />
                      {column.options && column.options.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {column.options.map((opt, i) => (
                            <span key={i} className="inline-flex items-center rounded-full border border-[#1e2b66]/20 bg-white px-3 py-1 text-sm font-medium text-[#1e2b66]">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-slate-600">Separa las opciones con comas o saltos de línea</p>
                    </div>
                  )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ColumnBuilder;
