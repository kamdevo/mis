<?php
// app/Http/Controllers/UserDocumentsController.php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class UserDocumentsController extends Controller
{
    /**
     * Obtener los documentos a los que tiene acceso el usuario actual
     */
    public function myDocuments(): JsonResponse
    {
        $user = Auth::user();
        $isAdmin = $user->rol === UserRole::ADMIN || $user->rol === UserRole::SUPER_ADMIN;
        
        // Si es admin, ver todos los documentos
        if ($isAdmin) {
            $documents = \App\Models\DynamicForm::with(['userPermissions' => function($query) use ($user) {
                $query->where('user_id', $user->id);
            }])->get()->map(function ($document) {
                return [
                    'id' => $document->id,
                    'name' => $document->name,
                    'slug' => $document->slug,
                    'description' => $document->description,
                    'can_view' => true,
                    'can_edit' => true,
                    'can_delete' => true,
                    'is_admin' => true
                ];
            });
        } else {
            // Si no es admin, solo ver documentos con permisos
            $documents = $user->accessibleDocuments()->get()->map(function ($document) use ($user) {
                $permission = $user->documentPermissions()
                    ->where('document_id', $document->id)
                    ->first();
                
                return [
                    'id' => $document->id,
                    'name' => $document->name,
                    'slug' => $document->slug,
                    'description' => $document->description,
                    'can_view' => $permission->can_view ?? false,
                    'can_edit' => $permission->can_edit ?? false,
                    'can_delete' => $permission->can_delete ?? false,
                    'is_admin' => false
                ];
            });
        }

        return response()->json([
            'success' => true,
            'data' => $documents
        ]);
    }

    /**
     * Obtener un documento específico con verificación de permisos
     */
    public function showDocument($documentId): JsonResponse
    {
        $user = Auth::user();
        $isAdmin = $user->rol === UserRole::ADMIN || $user->rol === UserRole::SUPER_ADMIN;
        
        if (!$user->canAccessDocument($documentId, 'view')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para acceder a este documento'
            ], 403);
        }

        $document = \App\Models\DynamicForm::findOrFail($documentId);
        
        $permission = $user->documentPermissions()
            ->where('document_id', $documentId)
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'document' => $document,
                'permissions' => [
                    'can_view' => $isAdmin ? true : ($permission->can_view ?? false),
                    'can_edit' => $isAdmin ? true : ($permission->can_edit ?? false),
                    'can_delete' => $isAdmin ? true : ($permission->can_delete ?? false),
                ]
            ]
        ]);
    }
}