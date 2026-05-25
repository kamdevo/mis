<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DynamicFormController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\DashboardController;
use Illuminate\Http\Request;
use App\Http\Controllers\UserDocumentPermissionController; // 🔽 AGREGAR ESTA LÍNEA
use App\Http\Controllers\UserDocumentsController;
use Illuminate\Support\Facades\Route;

// Rutas públicas (sin autenticación)
Route::post('/login', [AuthController::class, 'login']);

// Rutas protegidas (requieren autenticación)
Route::middleware('auth:sanctum')->group(function () {
    // Rutas de autenticación protegidas
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Dashboard Statistics Routes (MUST be before users resource routes)
    Route::get('/users/dashboard-stats', [DashboardController::class, 'getUserDashboardStats']);
    Route::get('/admin/dashboard-stats', [DashboardController::class, 'getAdminDashboardStats']);
    Route::get('/superadmin/dashboard-stats', [DashboardController::class, 'getSuperAdminDashboardStats']);

    // Rutas de usuarios (protegidas)
    Route::apiResource('users', UserController::class);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
    Route::get('/users/{user}/document-permissions', [UserDocumentPermissionController::class, 'getUserPermissions']);
    Route::post('/users/{user}/document-permissions', [UserDocumentPermissionController::class, 'updateUserPermissions']);
    Route::delete('/users/{user}/document-permissions/{permission}', [UserDocumentPermissionController::class, 'deleteUserPermission']);

    // Permisos por documento
    Route::get('/forms/{formId}/permissions', [UserDocumentPermissionController::class, 'getDocumentPermissions']);
    Route::post('/forms/{formId}/permissions', [UserDocumentPermissionController::class, 'syncDocumentPermissions']);

    // Rutas de formularios dinámicos
    Route::apiResource('forms', DynamicFormController::class);

    // Records Routes
    Route::get('/forms/{formId}/records', [DynamicFormController::class, 'getRecords']);
    Route::post('/forms/{formId}/records', [DynamicFormController::class, 'createRecord']);
    Route::put('/forms/{formId}/records/{id}', [DynamicFormController::class, 'updateRecord']);
    Route::put('/forms/{formId}/records/{id}/review', [DynamicFormController::class, 'reviewRecord']);
    Route::delete('/forms/{formId}/records/{id}', [DynamicFormController::class, 'deleteRecord']);

    // Activity Logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);

    // Tipos de Documentos
    Route::apiResource('document-types', App\Http\Controllers\DocumentTypeController::class);

    // Documentos disponibles para asignar permisos
    Route::get('/documents', [UserDocumentPermissionController::class, 'getAllDocuments']);
    // Documentos del usuario actual
    Route::get('/my-documents', [UserDocumentsController::class, 'myDocuments']);
    Route::get('/my-documents/{document}', [UserDocumentsController::class, 'showDocument']);
});
