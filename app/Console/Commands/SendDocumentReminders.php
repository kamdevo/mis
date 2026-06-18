<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

use App\Models\DynamicForm;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use App\Mail\DocumentReminderMail;
use Carbon\Carbon;

class SendDocumentReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'documents:send-reminders {--time= : Check for a specific time (HH:MM)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send email reminders for documents scheduled for this time';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // La hora seleccionada por el usuario es hora local de Colombia (UTC-5),
        // pero la app corre en UTC, así que comparamos en la zona de Bogotá.
        $now = Carbon::now('America/Bogota');
        $currentTime = $this->option('time') ?: $now->format('H:i');

        $this->info("Checking for reminders at {$currentTime}...");

        // Find documents with notification enabled
        // We match strictly the time H:i ignoring seconds
        $documents = DynamicForm::where('is_notification_enabled', true)
            ->whereRaw("TIME_FORMAT(notification_time, '%H:%i') = ?", [$currentTime])
            ->with(['userPermissions.user'])
            ->get();

        if ($documents->isEmpty()) {
            $this->info("No reminders scheduled for this time.");
            return;
        }

        foreach ($documents as $doc) {
            $this->info("Processing document: {$doc->name}");

            // Get unique users from permissions
            // Assuming permissions table links user_id
            $users = $doc->userPermissions->map(function ($perm) {
                return $perm->user;
            })->unique('id');

            foreach ($users as $user) {
                if ($user && $user->correo) {
                    try {
                        Mail::to($user->correo)->send(new DocumentReminderMail($user, $doc));
                        $this->info("Email sent to: {$user->correo}");
                    } catch (\Exception $e) {
                        $this->error("Failed to send email to {$user->correo}: " . $e->getMessage());
                    }
                }
            }
        }

        $this->info('Reminders check completed.');
    }
}
