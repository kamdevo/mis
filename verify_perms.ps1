$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$baseUrl = "http://127.0.0.1:8001/api"

try {
    # 1. Login
    $loginBody = @{ email = "admin@test.com"; password = "password" } | ConvertTo-Json
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    $headers = @{ Authorization = "Bearer $token"; Accept = "application/json" }

    # 2. Create temporary user
    # Trying "email", "name", "role", "password" as standard. 
    # If the app uses "correo", the task said "correo permisos.prueba..." which implies the field name is correo.
    $userEmail = "permisos.prueba.$timestamp@huv.gov.co"
    $userBody = @{ name = "Test User $timestamp"; email = $userEmail; role = "user"; password = "password" } | ConvertTo-Json
    
    try {
        $userResponse = Invoke-RestMethod -Uri "$baseUrl/users" -Method Post -Body $userBody -ContentType "application/json" -Headers $headers
    } catch {
       # If fails with email/name, try correo/nombre/rol
       $userBody = @{ nombre = "Test User $timestamp"; correo = $userEmail; rol = "user"; password = "password" } | ConvertTo-Json
       $userResponse = Invoke-RestMethod -Uri "$baseUrl/users" -Method Post -Body $userBody -ContentType "application/json" -Headers $headers
    }
    $userId = $userResponse.id

    # 3. Create temporary form
    $formName = "Permisos Prueba $timestamp"
    $formSlug = "permisos-prueba-$timestamp"
    $formBody = @{ name = $formName; slug = $formSlug; columns = @(@{name="Col1"; type="string"}) } | ConvertTo-Json
    $formResponse = Invoke-RestMethod -Uri "$baseUrl/forms" -Method Post -Body $formBody -ContentType "application/json" -Headers $headers
    $formId = $formResponse.id

    # 4. POST to /api/forms/{formId}/permissions
    $permBody = @{ user_id = $userId; can_view = $true; can_edit = $true; can_delete = $false; can_review = $true } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/forms/$formId/permissions" -Method Post -Body $permBody -ContentType "application/json" -Headers $headers

    # 5. GET /api/forms/{formId}/permissions and verify
    $perms = Invoke-RestMethod -Uri "$baseUrl/forms/$formId/permissions" -Method Get -Headers $headers
    $userPerm = $perms | Where-Object { $_.user_id -eq $userId }

    if ($userPerm -and $userPerm.can_view -and $userPerm.can_edit -and ($userPerm.can_delete -eq $false) -and $userPerm.can_review) {
        Write-Host "Initial permissions verification: PASS"
    } else {
        Write-Host "Initial permissions verification: FAIL"
        Write-Host ($userPerm | ConvertTo-Json)
    }

    # 6. POST again with all false
    $revokeBody = @{ user_id = $userId; can_view = $false; can_edit = $false; can_delete = $false; can_review = $false } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/forms/$formId/permissions" -Method Post -Body $revokeBody -ContentType "application/json" -Headers $headers

    # 7. GET and verify no permission row
    $permsAfter = Invoke-RestMethod -Uri "$baseUrl/forms/$formId/permissions" -Method Get -Headers $headers
    $userPermAfter = $permsAfter | Where-Object { $_.user_id -eq $userId }

    if (-not $userPermAfter) {
        Write-Host "Revoke permissions verification: PASS"
    } else {
        Write-Host "Revoke permissions verification: FAIL"
        Write-Host ($userPermAfter | ConvertTo-Json)
    }
} catch {
    Write-Host "An error occurred: $_"
} finally {
    if ($formId) { Invoke-RestMethod -Uri "$baseUrl/forms/$formId" -Method Delete -Headers $headers | Out-Null }
    if ($userId) { Invoke-RestMethod -Uri "$baseUrl/users/$userId" -Method Delete -Headers $headers | Out-Null }
    Write-Host "Cleanup completed."
}
