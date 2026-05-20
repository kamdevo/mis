<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'correo' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'correo.required' => 'Ingresa tu correo electrónico.',
            'correo.email' => 'Ingresa un correo electrónico válido.',
            'password.required' => 'Ingresa tu contraseña.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Revisa los datos ingresados.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::where('correo', $request->correo)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Las credenciales son incorrectas.',
            ], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        $user->load('documentPermissions');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'nombre' => $user->nombre,
                'correo' => $user->correo,
                'telefono' => $user->telefono,
                'rol' => $user->rol->value,
                'document_permissions' => $user->documentPermissions,
            ],
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada exitosamente'
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        $request->user()->load('documentPermissions');

        return response()->json([
            'user' => [
                'id' => $request->user()->id,
                'nombre' => $request->user()->nombre,
                'correo' => $request->user()->correo,
                'telefono' => $request->user()->telefono,
                'rol' => $request->user()->rol->value,
                'document_permissions' => $request->user()->documentPermissions,
            ]
        ]);
    }
}