<?php
// app/Http/Controllers/UserDocumentPermissionController.php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\DynamicForm;
use App\Models\UserDocumentPermission;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class UserDocumentPermissionController extends Controller
{
    private function documentPermissions($formId)
    {
        return UserDocumentPermission::where('document_id', $formId)
            ->with('user:id,nombre,correo,rol')
            ->get()
            ->map(function ($permission) {
                return [
                    'user_id' => $permission->user_id,
                    'user_name' => $permission->user->nombre,
                    'user_email' => $permission->user->correo,
                    'user_role' => $permission->user->rol instanceof \BackedEnum ? $permission->user->rol->value : $permission->user->rol,
                    'can_view' => $permission->can_view,
                    'can_edit' => $permission->can_edit,
                    'can_delete' => $permission->can_delete,
                    'can_review' => $permission->can_review,
                ];
            })
            ->values();
    }

    /**
     * Obtener todos los permisos de documentos de un usuario
     */
    public function getUserPermissions($userId): JsonResponse
    {
        try {
            $user = User::findOrFail($userId);

            $permissions = $user->documentPermissions()
                ->with('document')
                ->get()
                ->map(function ($permission) {
                    return [
                        'document_id' => $permission->document_id,
                        'document_name' => $permission->document->name,
                        'document_slug' => $permission->document->slug,
                        'can_view' => $permission->can_view,
                        'can_edit' => $permission->can_edit,
                        'can_delete' => $permission->can_delete,
                        'can_review' => $permission->can_review, // Added
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener permisos del usuario'
            ], 500);
        }
    }

    /**
     * Actualizar los permisos de documentos de un usuario
     */
    public function updateUserPermissions(Request $request, $userId): JsonResponse
    {
        try {
            $request->validate([
                'permissions' => 'required|array',
                'permissions.*.document_id' => 'required|exists:dynamic_forms,id',
                'permissions.*.can_view' => 'boolean',
                'permissions.*.can_edit' => 'boolean',
                'permissions.*.can_delete' => 'boolean',
                'permissions.*.can_review' => 'boolean', // Added
            ]);

            $user = User::findOrFail($userId);

            foreach ($request->permissions as $permissionData) {
                UserDocumentPermission::updateOrCreate(
                    [
                        'user_id' => $userId,
                        'document_id' => $permissionData['document_id']
                    ],
                    [
                        'can_view' => $permissionData['can_view'] ?? false,
                        'can_edit' => $permissionData['can_edit'] ?? false,
                        'can_delete' => $permissionData['can_delete'] ?? false,
                        'can_review' => $permissionData['can_review'] ?? false, // Added
                    ]
                );
            }

            // Obtener los permisos actualizados para devolverlos
            $updatedPermissions = $user->documentPermissions()
                ->with('document')
                ->get()
                ->map(function ($permission) {
                    return [
                        'document_id' => $permission->document_id,
                        'document_name' => $permission->document->name,
                        'document_slug' => $permission->document->slug,
                        'can_view' => $permission->can_view,
                        'can_edit' => $permission->can_edit,
                        'can_delete' => $permission->can_delete,
                        'can_review' => $permission->can_review, // Added
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Permisos actualizados correctamente',
                'data' => $updatedPermissions
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar permisos'
            ], 500);
        }
    }

    /**
     * Eliminar un permiso específico de un usuario
     */
    public function deleteUserPermission($userId, $documentId): JsonResponse
    {
        try {
            UserDocumentPermission::where('user_id', $userId)
                ->where('document_id', $documentId)
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Permiso eliminado correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar permiso'
            ], 500);
        }
    }

    /**
     * Obtener todos los documentos disponibles
     */
    public function getAllDocuments(): JsonResponse
    {
        try {
            $documents = DynamicForm::select('id', 'name', 'slug', 'created_at')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $documents
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener documentos'
            ], 500);
        }
    }

    /**
     * Obtener todos los permisos asignados a un documento específico
     */
    public function getDocumentPermissions($formId): JsonResponse
    {
        try {
            $permissions = $this->documentPermissions($formId);

            return response()->json([
                'success' => true,
                'data' => $permissions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener permisos del documento'
            ], 500);
        }
    }

    public function syncDocumentPermissions(Request $request, $formId): JsonResponse
    {
        try {
            DynamicForm::findOrFail($formId);

            $validated = $request->validate([
                'permissions' => 'present|array',
                'permissions.*.user_id' => 'required|exists:users,id',
                'permissions.*.can_view' => 'boolean',
                'permissions.*.can_edit' => 'boolean',
                'permissions.*.can_delete' => 'boolean',
                'permissions.*.can_review' => 'boolean',
            ]);

            $permissions = collect($validated['permissions'])
                ->map(function ($permission) use ($formId) {
                    $canView = (bool) ($permission['can_view'] ?? false);
                    $canEdit = (bool) ($permission['can_edit'] ?? false);
                    $canDelete = (bool) ($permission['can_delete'] ?? false);
                    $canReview = (bool) ($permission['can_review'] ?? false);

                    if ($canDelete) {
                        $canEdit = true;
                    }

                    if ($canEdit || $canDelete || $canReview) {
                        $canView = true;
                    }

                    return [
                        'user_id' => $permission['user_id'],
                        'document_id' => $formId,
                        'can_view' => $canView,
                        'can_edit' => $canEdit,
                        'can_delete' => $canDelete,
                        'can_review' => $canReview,
                    ];
                })
                ->filter(fn ($permission) => $permission['can_view'] || $permission['can_edit'] || $permission['can_delete'] || $permission['can_review'])
                ->keyBy('user_id')
                ->values();

            DB::transaction(function () use ($formId, $permissions) {
                UserDocumentPermission::where('document_id', $formId)->delete();

                foreach ($permissions as $permission) {
                    UserDocumentPermission::create($permission);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Permisos actualizados correctamente',
                'data' => $this->documentPermissions($formId)
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar permisos del documento'
            ], 500);
        }
    }
}
