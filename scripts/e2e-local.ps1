<#
.SYNOPSIS
  Corre los tests E2E (Playwright) en tu maquina, de punta a punta.

.DESCRIPTION
  1. Crea desde cero la base de pruebas "atlas_gym_e2e" (NUNCA la del gimnasio).
  2. Compila el backend si hace falta y lo levanta en perfil prod (Flyway + validate),
     con titular y secreto de totem de prueba.
  3. Corre `npx playwright test` (Playwright levanta el front solo, o reutiliza el de :3000).
  4. Apaga el backend al terminar, aunque los tests fallen.

.EXAMPLE
  .\scripts\e2e-local.ps1 -BackendRepo C:\ruta\atlasgym_back -DbPort 3307 -MysqlExe C:\xampp\mysql\bin\mysql.exe
.EXAMPLE
  .\scripts\e2e-local.ps1 -BackendRepo C:\ruta\atlasgym_back -DbPort 3307 -MysqlExe C:\xampp\mysql\bin\mysql.exe -Compilar -- --headed
  (lo que va despues de "--" se le pasa a Playwright; --headed muestra el navegador)
#>
param(
    # Carpeta del repo del backend. Se puede fijar una vez con la variable de entorno ATLAS_BACK_REPO.
    [string]$BackendRepo = $env:ATLAS_BACK_REPO,
    [string]$MysqlExe = 'mysql',
    [string]$DbHost = '127.0.0.1',
    [int]$DbPort = 3306,
    [string]$DbUser = 'root',
    [string]$DbPassword = '',
    [int]$BackendPort = 8080,
    [switch]$Compilar,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$ArgsPlaywright
)
$ErrorActionPreference = 'Stop'
$front = Resolve-Path (Join-Path $PSScriptRoot '..')
if (-not $BackendRepo -or -not (Test-Path (Join-Path $BackendRepo 'pom.xml'))) {
    throw "Indicá la carpeta del backend: -BackendRepo 'C:\ruta\atlasgym_back' (o la variable ATLAS_BACK_REPO). Valor actual: '$BackendRepo'"
}
$BackendRepo = Resolve-Path $BackendRepo
Write-Host "Backend: $BackendRepo (rama $(git -C $BackendRepo branch --show-current), commit $(git -C $BackendRepo log --format=%h -1))" -ForegroundColor DarkGray
$base = 'atlas_gym_e2e'

# Datos de prueba: los mismos que usan los tests (e2e/soporte.ts) y el CI.
$env:E2E_ADMIN_EMAIL = 'titular1@e2e.local'
$env:E2E_ADMIN_PASSWORD = 'E2eTitular1!'
$env:E2E_ADMIN_NOMBRE = 'Titular E2E'
$env:E2E_TOTEM_SECRET = 'secreto-totem-e2e'
$env:E2E_BACKEND_URL = "http://127.0.0.1:$BackendPort"

Write-Host "1/4 Base de pruebas $base (se borra y se crea vacia)" -ForegroundColor Cyan
$credencial = @('-u', $DbUser, '-h', $DbHost, '-P', "$DbPort")
if ($DbPassword) { $credencial += "-p$DbPassword" }
& $MysqlExe @credencial -e "DROP DATABASE IF EXISTS $base; CREATE DATABASE $base CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) { throw "No se pudo recrear la base $base" }

$jar = Get-ChildItem (Join-Path $BackendRepo 'target') -Filter 'backend-*.jar' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike '*plain*' } | Select-Object -First 1
if ($Compilar -or -not $jar) {
    Write-Host '2/4 Compilando backend (mvnw package)' -ForegroundColor Cyan
    Push-Location $BackendRepo
    try { & .\mvnw.cmd -q -B -DskipTests package; if ($LASTEXITCODE -ne 0) { throw 'Fallo la compilacion del backend' } }
    finally { Pop-Location }
    $jar = Get-ChildItem (Join-Path $BackendRepo 'target') -Filter 'backend-*.jar' | Where-Object { $_.Name -notlike '*plain*' } | Select-Object -First 1
} else {
    Write-Host "2/4 Usando backend ya compilado: $($jar.Name) (agregar -Compilar para recompilar)" -ForegroundColor Cyan
}

Write-Host "3/4 Levantando backend en :$BackendPort" -ForegroundColor Cyan
$env:SPRING_PROFILES_ACTIVE = 'prod'
$env:SERVER_PORT = "$BackendPort"
$env:SPRING_DATASOURCE_URL = "jdbc:mysql://${DbHost}:$DbPort/${base}?serverTimezone=America/Argentina/Buenos_Aires"
$env:DB_USER = $DbUser
$env:DB_PASSWORD = $DbPassword
$env:ATLAS_JWT_SECRET = 'e2e0000000000000000000000000000000000000000000000000000000000000e2e'
$env:ATLAS_ADMIN_BOOTSTRAP_ENABLED = 'true'
$env:ATLAS_ADMIN_EMAIL = $env:E2E_ADMIN_EMAIL
$env:ATLAS_ADMIN_PASSWORD = $env:E2E_ADMIN_PASSWORD
$env:ATLAS_ADMIN_NOMBRE = $env:E2E_ADMIN_NOMBRE
$env:ATLAS_TOTEM_SECRET = $env:E2E_TOTEM_SECRET
$env:ATLAS_CORS_ALLOWED_ORIGIN = 'http://localhost:3000'
$log = Join-Path $front 'test-results\backend-e2e.log'
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
$java = Start-Process java -ArgumentList '-Duser.timezone=America/Argentina/Buenos_Aires', '-jar', "`"$($jar.FullName)`"" `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err" -PassThru -WindowStyle Hidden

try {
    # Tomcat abre el puerto antes de crear los titulares: se espera a que el login del titular funcione.
    $listo = $false
    $cuerpo = @{ email = $env:E2E_ADMIN_EMAIL; password = $env:E2E_ADMIN_PASSWORD } | ConvertTo-Json
    for ($i = 0; $i -lt 90 -and -not $listo; $i++) {
        Start-Sleep -Seconds 2
        if ($java.HasExited) { throw "El backend se cerro al arrancar. Ver $log" }
        try {
            Invoke-RestMethod "http://127.0.0.1:$BackendPort/api/auth/login" -Method Post -Body $cuerpo -ContentType 'application/json' -TimeoutSec 5 | Out-Null
            $listo = $true
        } catch { }
    }
    if (-not $listo) { throw "El backend no respondio a tiempo. Ver $log" }

    Write-Host '4/4 Corriendo Playwright' -ForegroundColor Cyan
    Push-Location $front
    try { & npx playwright test @ArgsPlaywright; $codigo = $LASTEXITCODE } finally { Pop-Location }
    if ($codigo -ne 0) { Write-Host "Hubo fallas. Informe: npx playwright show-report  |  log del backend: $log" -ForegroundColor Yellow }
    exit $codigo
}
finally {
    taskkill /T /F /PID $java.Id 2>$null | Out-Null
}
