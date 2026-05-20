<?php

namespace App\Http\Controllers;

use App\Models\DynamicForm;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Services\ActivityLogger;

class DynamicFormController extends Controller
{
    // Mapear tipos de datos frontend → MySQL
    private function mapColumnType($type)
    {
        return match ($type) {
            'string' => 'string',
            'text' => 'text',
            'number' => 'integer',
            'decimal' => 'decimal',
            'date' => 'date',
            'datetime' => 'datetime',
            'boolean' => 'boolean',
            'enum' => 'string',
            'signature' => 'longText',
            default => 'string'
        };
    }

    // Crear formulario y tabla física
    public function store(Request $request)
    {
        // Validar super admin (agrega tu lógica de roles aquí)
        // if (!$request->user()->isSuperAdmin()) {
        //     return response()->json(['error' => 'No autorizado'], 403);
        // }

        $reservedColumnNames = [
            'id',
            'created_by',
            'status',
            'reviewer_id',
            'reviewed_at',
            'review_comments',
            'created_at',
            'updated_at',
        ];

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|alpha_dash|unique:dynamic_forms,slug',
            'columns' => 'required|array|min:1',
            'columns.*.name' => ['required', 'string', 'max:64', 'regex:/^[a-z][a-z0-9_]*$/', 'distinct', Rule::notIn($reservedColumnNames)],
            'columns.*.type' => 'required|string|in:string,text,number,decimal,date,datetime,boolean,enum,signature',
            'columns.*.label' => 'required|string',
            'columns.*.required' => 'boolean',
            'columns.*.options' => 'array|required_if:columns.*.type,enum',
            'document_type_id' => 'nullable|exists:document_types,id',
            'is_notification_enabled' => 'boolean',
            'notification_time' => 'nullable|date_format:H:i',
        ], [
            'columns.*.name.required' => 'Cada campo debe tener un nombre técnico.',
            'columns.*.name.max' => 'El nombre técnico no puede superar 64 caracteres.',
            'columns.*.name.regex' => 'El nombre técnico debe estar en snake_case: solo minúsculas, números y guion bajo, empezando por una letra.',
            'columns.*.name.distinct' => 'Los nombres técnicos de los campos no pueden repetirse.',
            'columns.*.name.not_in' => 'Ese nombre técnico está reservado por el sistema. Usa otro nombre.',
            'columns.*.type.in' => 'Uno de los campos tiene un tipo de dato no permitido.',
            'columns.*.label.required' => 'Cada campo debe tener una etiqueta visible.',
        ]);

        // Generar nombre único para la tabla física
        $tableName = 'form_' . Str::slug($validated['slug'], '_') . '_' . time();

        // Crear tabla física
        Schema::create($tableName, function ($table) use ($validated) {
            $table->id();

            // Columnas de flujo de aprobación (Estándar)
            $table->unsignedBigInteger('created_by')->nullable()->index(); // Quién creó el registro
            $table->enum('status', ['draft', 'in_review', 'approved', 'returned'])->default('draft')->index();
            $table->unsignedBigInteger('reviewer_id')->nullable(); // Quién revisó
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_comments')->nullable();

            foreach ($validated['columns'] as $column) {
                // ... (existing logic)
                $dbType = $this->mapColumnType($column['type']);
                $blueprint = $table->{$dbType}($column['name']);

                if (!($column['required'] ?? false)) {
                    $blueprint->nullable();
                }
            }

            $table->timestamps();
        });

        // Guardar metadata del formulario
        $form = DynamicForm::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'table_name' => $tableName,
            'columns_config' => $validated['columns'],
            'created_by' => $request->user()->id ?? null,
            'document_type_id' => $validated['document_type_id'] ?? null,
            'is_notification_enabled' => $validated['is_notification_enabled'] ?? false,
            'notification_time' => $validated['notification_time'] ?? null,
        ]);

        return response()->json([
            'message' => 'Formulario y tabla creados exitosamente',
            'form' => $form,
            'table_name' => $tableName
        ], 201);
    }

    // Listar formularios
    public function index()
    {
        $forms = DynamicForm::all();
        return response()->json($forms);
    }

    // Obtener un formulario específico
    public function show($id)
    {
        $form = DynamicForm::findOrFail($id);
        return response()->json($form);
    }

    // Actualizar un formulario
    public function update(Request $request, $id)
    {
        $form = DynamicForm::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => ['sometimes', 'alpha_dash', Rule::unique('dynamic_forms')->ignore($id)],
            'document_type_id' => 'nullable|exists:document_types,id',
            'is_notification_enabled' => 'boolean',
            'notification_time' => 'nullable|date_format:H:i',
        ]);

        $form->update($validated);

        return response()->json([
            'message' => 'Formulario actualizado exitosamente',
            'form' => $form
        ]);
    }

    // Eliminar un formulario y su tabla física
    public function destroy($id)
    {
        $form = DynamicForm::findOrFail($id);

        // Eliminar la tabla física
        Schema::dropIfExists($form->table_name);

        // Eliminar el registro del formulario
        $form->delete();

        return response()->json([
            'message' => 'Formulario y tabla eliminados exitosamente'
        ]);
    }

    // ==========================================
    // MÉTODOS PARA GESTIONAR REGISTROS
    // ==========================================

    /**
     * Obtener todos los registros de un formulario
     * GET /api/forms/{id}/records
     */
    public function getRecords($formId)
    {
        $form = DynamicForm::findOrFail($formId);

        // Obtener todos los registros de la tabla dinámica
        $records = DB::table($form->table_name)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($records);
    }

    /**
     * Revisar un registro (Aprobar/Devolver)
     * PUT /api/forms/{id}/records/{recordId}/review
     */
    public function reviewRecord(Request $request, $formId, $recordId)
    {
        $form = DynamicForm::findOrFail($formId);
        $user = $request->user();

        // Verificar Permiso de Revisor
        // Nota: Asumimos que la relación 'userPermissions' existe en DynamicForm
        // O verificamos directamente en la tabla pivote
        $permission = DB::table('user_document_permissions')
            ->where('user_id', $user->id)
            ->where('document_id', $form->id)
            ->first();

        if (!$permission || !$permission->can_review) {
            // Si es Super Admin, permitimos
            if ($user->role !== 'super-admin') {
                return response()->json(['error' => 'No tienes permisos para revisar este documento'], 403);
            }
        }

        $validated = $request->validate([
            'status' => 'required|in:approved,returned',
            'comments' => 'nullable|string'
        ]);

        // Verificar existencia del registro
        $exists = DB::table($form->table_name)->where('id', $recordId)->exists();
        if (!$exists) {
            return response()->json(['error' => 'Registro no encontrado'], 404);
        }

        // Actualizar registro
        DB::table($form->table_name)
            ->where('id', $recordId)
            ->update([
                'status' => $validated['status'],
                'reviewer_id' => $user->id,
                'reviewed_at' => now(),
                'review_comments' => $validated['comments'],
                'updated_at' => now()
            ]);

        // Log
        ActivityLogger::log(
            'updated',
            "Revisó el registro #{$recordId}: {$validated['status']}",
            $form
        );

        return response()->json(['message' => 'Revisión guardada exitosamente']);
    }

    /**
     * Crear un nuevo registro
     * POST /api/forms/{id}/records
     */
    public function createRecord(Request $request, $formId)
    {
        $form = DynamicForm::findOrFail($formId);

        // Construir reglas de validación dinámicamente
        $rules = $this->buildValidationRules($form->columns_config);

        // Validar datos
        $validated = $request->validate($rules);

        // Preparar datos para inserción
        $data = array_merge($validated, [
            'created_at' => now(),
            'updated_at' => now(),
            'created_by' => $request->user()->id ?? null, // Guardar usuario creador
            'status' => 'draft' // Estado por defecto
        ]);

        // Insertar en la tabla física
        $recordId = DB::table($form->table_name)->insertGetId($data);

        // Obtener el registro recién creado
        $record = DB::table($form->table_name)->where('id', $recordId)->first();

        // Log Activity
        ActivityLogger::log(
            'created',
            "Creó un nuevo registro en el formulario '{$form->name}' (ID: {$recordId})",
            $form
        );

        return response()->json([
            'message' => 'Registro creado exitosamente',
            'record' => $record
        ], 201);
    }


    /**
     * Actualizar un registro existente
     * PUT /api/forms/{id}/records/{recordId}
     */
    public function updateRecord(Request $request, $formId, $recordId)
    {
        $form = DynamicForm::findOrFail($formId);

        // Verificar que el registro existe
        $exists = DB::table($form->table_name)->where('id', $recordId)->exists();
        if (!$exists) {
            return response()->json(['error' => 'Registro no encontrado'], 404);
        }

        // Construir reglas de validación dinámicamente
        $rules = $this->buildValidationRules($form->columns_config);

        // Validar datos
        $validated = $request->validate($rules);

        // Preparar datos para actualización
        $data = array_merge($validated, [
            'updated_at' => now()
        ]);

        // Actualizar en la tabla física
        DB::table($form->table_name)
            ->where('id', $recordId)
            ->update($data);

        // Obtener el registro actualizado
        $record = DB::table($form->table_name)->where('id', $recordId)->first();

        // Log Activity
        ActivityLogger::log(
            'updated',
            "Actualizó el registro #{$recordId} en el formulario '{$form->name}'",
            $form
        );

        return response()->json([
            'message' => 'Registro actualizado exitosamente',
            'record' => $record
        ]);
    }

    /**
     * Eliminar un registro
     * DELETE /api/forms/{id}/records/{recordId}
     */
    public function deleteRecord($formId, $recordId)
    {
        $form = DynamicForm::findOrFail($formId);

        // Verificar que el registro existe
        $exists = DB::table($form->table_name)->where('id', $recordId)->exists();
        if (!$exists) {
            return response()->json(['error' => 'Registro no encontrado'], 404);
        }

        // Eliminar el registro
        DB::table($form->table_name)->where('id', $recordId)->delete();

        // Log Activity
        ActivityLogger::log(
            'deleted',
            "Eliminó el registro #{$recordId} del formulario '{$form->name}'",
            $form
        );

        return response()->json([
            'message' => 'Registro eliminado exitosamente'
        ]);
    }

    /**
     * Construir reglas de validación dinámicamente según la configuración del formulario
     */
    private function buildValidationRules(array $columnsConfig): array
    {
        $rules = [];

        foreach ($columnsConfig as $column) {
            $columnRules = [];

            // Requerido o nullable
            if ($column['required'] ?? false) {
                $columnRules[] = 'required';
            } else {
                $columnRules[] = 'nullable';
            }

            // Agregar reglas según el tipo
            switch ($column['type']) {
                case 'string':
                    $columnRules[] = 'string';
                    $columnRules[] = 'max:255';
                    break;

                case 'text':
                    $columnRules[] = 'string';
                    break;

                case 'number':
                    $columnRules[] = 'integer';
                    break;

                case 'decimal':
                    $columnRules[] = 'numeric';
                    break;

                case 'date':
                    $columnRules[] = 'date';
                    break;

                case 'datetime':
                    $columnRules[] = 'date';
                    break;

                case 'boolean':
                    $columnRules[] = 'boolean';
                    break;

                case 'enum':
                    if (isset($column['options']) && is_array($column['options'])) {
                        $columnRules[] = Rule::in($column['options']);
                    }
                    break;

                case 'signature':
                    $columnRules[] = 'string';
                    break;
            }

            $rules[$column['name']] = $columnRules;
        }

        return $rules;
    }
}