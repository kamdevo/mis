<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Revisa cada minuto si hay documentos cuya hora de notificación coincide
// con la hora actual y envía los recordatorios por correo a los usuarios asignados.
Schedule::command('documents:send-reminders')
    ->everyMinute()
    ->withoutOverlapping();
