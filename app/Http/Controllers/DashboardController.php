<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\DynamicForm;
use App\Models\ActivityLog;
use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics for regular users
     */
    public function getUserDashboardStats(Request $request)
    {
        try {
            $user = $request->user();
            $isAdmin = $user->rol === UserRole::ADMIN || $user->rol === UserRole::SUPER_ADMIN;

            // Documentos accesibles: todos para admin, solo los asignados para usuarios regulares
            $accessibleDocuments = $isAdmin
                ? DynamicForm::all()
                : $user->accessibleDocuments()->get();

            $availableDocuments = $accessibleDocuments->count();

            // Get total records created by this user in the last 7 days
            $recentRecordsCount = ActivityLog::where('user_id', $user->id)
                ->where('action', 'created')
                ->where('subject_type', 'record')
                ->where('created_at', '>=', Carbon::now()->subDays(7))
                ->count();

            // Get records per day for the last 7 days
            $recordsPerDay = ActivityLog::where('user_id', $user->id)
                ->where('action', 'created')
                ->where('subject_type', 'record')
                ->where('created_at', '>=', Carbon::now()->subDays(7))
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(function ($item) {
                    return [
                        'date' => Carbon::parse($item->date)->format('M d'),
                        'count' => $item->count
                    ];
                });

            // Solo los documentos a los que el usuario tiene acceso
            $myDocuments = $accessibleDocuments->map(function ($doc) use ($isAdmin) {
                $canEdit = $isAdmin ? true : (bool) ($doc->pivot->can_edit ?? false);

                return [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'description' => $doc->description,
                    'can_create' => $canEdit,
                    'can_edit' => $canEdit,
                ];
            })->values();

            return response()->json([
                'availableDocuments' => $availableDocuments,
                'recentRecordsCount' => $recentRecordsCount,
                'recordsPerDay' => $recordsPerDay,
                'myDocuments' => $myDocuments,
            ]);
        } catch (\Exception $e) {
            Log::error('Dashboard Stats Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get dashboard statistics for admin users
     */
    public function getAdminDashboardStats(Request $request)
    {
        try {
            // Total counts
            $totalUsers = User::count();
            $totalDocuments = DynamicForm::count();

            // Total records across all forms
            $totalRecords = 0;
            $forms = DynamicForm::all();
            foreach ($forms as $form) {
                if ($form->table_name && DB::getSchemaBuilder()->hasTable($form->table_name)) {
                    $totalRecords += DB::table($form->table_name)->count();
                }
            }

            // Forms with activity today
            $formsActiveToday = ActivityLog::where('subject_type', 'record')
                ->whereDate('created_at', Carbon::today())
                ->distinct('subject_id')
                ->count('subject_id');

            // Records created over last 30 days
            $recordsPerDay = ActivityLog::where('subject_type', 'record')
                ->where('action', 'created')
                ->where('created_at', '>=', Carbon::now()->subDays(30))
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(function ($item) {
                    return [
                        'date' => Carbon::parse($item->date)->format('M d'),
                        'count' => $item->count
                    ];
                });

            // Records by document type
            $recordsByDocument = [];
            $topForms = DynamicForm::limit(5)->get();
            foreach ($topForms as $form) {
                if ($form->table_name && DB::getSchemaBuilder()->hasTable($form->table_name)) {
                    $count = DB::table($form->table_name)->count();
                    $recordsByDocument[] = [
                        'name' => $form->name,
                        'count' => $count
                    ];
                }
            }

            // Pending/recent forms
            $pendingForms = ActivityLog::where('subject_type', 'record')
                ->whereDate('created_at', Carbon::today())
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($activity) {
                    return [
                        'id' => $activity->id,
                        'user' => $activity->user ? $activity->user->nombre : 'Unknown',
                        'description' => $activity->description,
                        'created_at' => $activity->created_at->format('H:i'),
                    ];
                });

            return response()->json([
                'totalUsers' => $totalUsers,
                'totalDocuments' => $totalDocuments,
                'totalRecords' => $totalRecords,
                'formsActiveToday' => $formsActiveToday,
                'recordsPerDay' => $recordsPerDay,
                'recordsByDocument' => $recordsByDocument,
                'pendingForms' => $pendingForms,
            ]);
        } catch (\Exception $e) {
            Log::error('Admin Dashboard Stats Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get dashboard statistics for super admin users
     */
    public function getSuperAdminDashboardStats(Request $request)
    {
        try {
            Log::info('Step 1: Counts');
            // System-wide metrics
            $totalUsers = User::count();
            $totalDocuments = DynamicForm::count();

            Log::info('Step 2: Total Records');
            // Total records
            $totalRecords = 0;
            $forms = DynamicForm::all();
            foreach ($forms as $form) {
                if ($form->table_name && DB::getSchemaBuilder()->hasTable($form->table_name)) {
                    $totalRecords += DB::table($form->table_name)->count();
                }
            }

            $totalActivities = ActivityLog::count();

            Log::info('Step 3: Users by role');
            // User distribution by role
            $usersByRole = User::select('rol', DB::raw('COUNT(*) as count'))
                ->groupBy('rol')
                ->get()
                ->map(function ($item) {
                    // Check if role is an Enum or string
                    $roleName = $item->rol instanceof \BackedEnum ? $item->rol->value : (string) $item->rol;
                    return [
                        'role' => ucfirst($roleName),
                        'count' => $item->count
                    ];
                });

            Log::info('Step 4: Active Docs');
            // Most active documents
            $mostActiveDocuments = [];
            $allForms = DynamicForm::all();
            foreach ($allForms as $form) {
                if ($form->table_name && DB::getSchemaBuilder()->hasTable($form->table_name)) {
                    $count = DB::table($form->table_name)->count();
                    $mostActiveDocuments[] = [
                        'name' => $form->name,
                        'count' => $count
                    ];
                }
            }
            // Sort by count descending and take top 5
            usort($mostActiveDocuments, function ($a, $b) {
                return $b['count'] - $a['count'];
            });
            $mostActiveDocuments = array_slice($mostActiveDocuments, 0, 5);

            Log::info('Step 5: User Activity');
            // User activity over last 7 days
            $userActivityPerDay = ActivityLog::where('created_at', '>=', Carbon::now()->subDays(7))
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(function ($item) {
                    return [
                        'date' => Carbon::parse($item->date)->format('M d'),
                        'count' => $item->count
                    ];
                });

            Log::info('Step 6: Doc Trend');
            // Document creation trend (last 30 days)
            $documentCreationTrend = DynamicForm::where('created_at', '>=', Carbon::now()->subDays(30))
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(function ($item) {
                    return [
                        'date' => Carbon::parse($item->date)->format('M d'),
                        'count' => $item->count
                    ];
                });

            Log::info('Step 7: Activity Preview');
            // Activity log preview (last 15 activities)
            $activityLogPreview = ActivityLog::with('user')
                ->orderBy('created_at', 'desc')
                ->limit(15)
                ->get()
                ->map(function ($activity) {
                    return [
                        'id' => $activity->id,
                        'user' => $activity->user ? $activity->user->nombre : 'System',
                        'action' => $activity->action,
                        'subject_type' => $activity->subject_type ?? 'unknown',
                        'description' => $activity->description,
                        'created_at' => $activity->created_at->diffForHumans(),
                    ];
                });

            Log::info('Step 8: Done');

            return response()->json([
                'totalUsers' => $totalUsers,
                'totalDocuments' => $totalDocuments,
                'totalRecords' => $totalRecords,
                'totalActivities' => $totalActivities,
                'usersByRole' => $usersByRole,
                'mostActiveDocuments' => $mostActiveDocuments,
                'userActivityPerDay' => $userActivityPerDay,
                'documentCreationTrend' => $documentCreationTrend,
                'activityLogPreview' => $activityLogPreview,
            ]);
        } catch (\Exception $e) {
            Log::error('SuperAdmin Dashboard Stats Error at step: ' . ($step ?? 'unknown') . ' - ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
