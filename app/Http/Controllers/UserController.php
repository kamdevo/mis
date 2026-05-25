<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use App\Models\ActivityLog; // 🔽 IMPORTAR MODELO
use Illuminate\Support\Facades\Auth; // 🔽 IMPORTAR AUTH FOR LOGGING

class UserController extends Controller
{
    private function roleValue(User $user): string
    {
        return $user->rol instanceof UserRole ? $user->rol->value : (string) $user->rol;
    }

    public function index(): JsonResponse
    {
        $users = User::all();
        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'correo' => 'required|email|unique:users,correo',
            'password' => 'required|string|min:6',
            'telefono' => 'nullable|string|max:20',
            'rol' => 'required|in:' . implode(',', UserRole::values()),
            'document_permissions' => 'sometimes|array',
            'document_permissions.*.document_id' => 'required_with:document_permissions|exists:dynamic_forms,id',
            'document_permissions.*.can_view' => 'sometimes|boolean',
            'document_permissions.*.can_edit' => 'sometimes|boolean',
            'document_permissions.*.can_delete' => 'sometimes|boolean',
            'document_permissions.*.can_review' => 'sometimes|boolean',
        ]);

        // 🔽 AGREGAR HASH DE CONTRASEÑA
        $validated['password'] = Hash::make($validated['password']);
        $permissions = $validated['document_permissions'] ?? [];
        unset($validated['document_permissions']);

        $user = User::create($validated);

        // 🔽 AGREGAR MANEJO DE PERMISOS DE DOCUMENTOS
        if (!empty($permissions)) {
            foreach ($permissions as $permission) {
                \App\Models\UserDocumentPermission::create([
                    'user_id' => $user->id,
                    'document_id' => $permission['document_id'],
                    'can_view' => $permission['can_view'] ?? false,
                    'can_edit' => $permission['can_edit'] ?? false,
                    'can_delete' => $permission['can_delete'] ?? false,
                    'can_review' => $permission['can_review'] ?? false,
                ]);
            }
        }

        // 🔽 REGISTRAR ACTIVIDAD
        ActivityLog::create([
            'user_id' => Auth::id() ?? $user->id, // Fallback to created user if no auth (e.g. seeder/first user)
            'action' => 'user_created',
            'description' => "Usuario creado: {$user->nombre} ({$this->roleValue($user)})",
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'id' => $user->id,
            'nombre' => $user->nombre,
            'correo' => $user->correo,
            'telefono' => $user->telefono,
            'rol' => $this->roleValue($user),
            'created_at' => $user->created_at,
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        // Cargar permisos
        $user->load('documentPermissions');

        return response()->json([
            'id' => $user->id,
            'nombre' => $user->nombre,
            'correo' => $user->correo,
            'telefono' => $user->telefono,
            'rol' => $this->roleValue($user),
            'document_permissions' => $user->documentPermissions,
            'created_at' => $user->created_at,
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'sometimes|string|max:255',
            'correo' => 'sometimes|email|unique:users,correo,' . $user->id,
            'password' => 'sometimes|string|min:6',
            'telefono' => 'nullable|string|max:20',
            'rol' => 'sometimes|in:' . implode(',', UserRole::values()),
            'document_permissions' => 'sometimes|array',
            'document_permissions.*.document_id' => 'required_with:document_permissions|exists:dynamic_forms,id',
            'document_permissions.*.can_view' => 'sometimes|boolean',
            'document_permissions.*.can_edit' => 'sometimes|boolean',
            'document_permissions.*.can_delete' => 'sometimes|boolean',
            'document_permissions.*.can_review' => 'sometimes|boolean',
        ]);

        // 🔽 AGREGAR HASH DE CONTRASEÑA SOLO SI SE PROPORCIONA
        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $permissions = $validated['document_permissions'] ?? null;
        unset($validated['document_permissions']);

        $user->update($validated);

        // 🔽 AGREGAR ACTUALIZACIÓN DE PERMISOS DE DOCUMENTOS
        if (is_array($permissions)) {
            // Eliminar permisos existentes para re-crearlos (estrategia simple para manejar eliminaciones)
            \App\Models\UserDocumentPermission::where('user_id', $user->id)->delete();

            foreach ($permissions as $permission) {
                \App\Models\UserDocumentPermission::create([
                    'user_id' => $user->id,
                    'document_id' => $permission['document_id'],
                    'can_view' => $permission['can_view'] ?? false,
                    'can_edit' => $permission['can_edit'] ?? false,
                    'can_delete' => $permission['can_delete'] ?? false,
                    'can_review' => $permission['can_review'] ?? false,
                ]);
            }
        }

        // 🔽 REGISTRAR ACTIVIDAD
        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'user_updated',
            'description' => "Usuario actualizado: {$user->nombre}",
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'id' => $user->id,
            'nombre' => $user->nombre,
            'correo' => $user->correo,
            'telefono' => $user->telefono,
            'rol' => $this->roleValue($user),
            'updated_at' => $user->updated_at,
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $userData = "{$user->nombre} ({$user->correo})";
        $userId = $user->id;

        $user->delete();

        // 🔽 REGISTRAR ACTIVIDAD
        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'user_deleted',
            'description' => "Usuario eliminado: {$userData}",
            'subject_type' => User::class,
            'subject_id' => $userId,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(null, 204);
    }
}
