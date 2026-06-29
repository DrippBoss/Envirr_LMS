<#
.SYNOPSIS
    One-click local launcher for Envirr LMS (Windows / PowerShell).

.DESCRIPTION
    Brings the whole stack up with a single command:
      - verifies Docker is installed and running
      - creates .env from .env.example on first run
      - builds + starts all containers (db, redis, web, celery, frontend)
      - waits for Postgres, then runs migrations
      - seeds demo course content (only if the DB is empty)
      - creates demo login accounts
      - prints the URLs and credentials

    Re-runnable: safe to run repeatedly. Seeding and account creation are idempotent.

.EXAMPLE
    .\scripts\run.ps1
    .\scripts\run.ps1 -Rebuild     # force a clean image rebuild
    .\scripts\run.ps1 -Down        # stop the stack
#>
param(
    [switch]$Rebuild,
    [switch]$Down
)

# 'Continue' (not 'Stop'): native tools like `docker compose` write harmless
# warnings to stderr, which under 'Stop' would be promoted to terminating errors
# in Windows PowerShell. Every native call below is guarded by $LASTEXITCODE.
$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Info($m)  { Write-Host "  $m" -ForegroundColor Cyan }
function Ok($m)    { Write-Host "  $m" -ForegroundColor Green }
function Warn($m)  { Write-Host "  $m" -ForegroundColor Yellow }
function Step($m)  { Write-Host "`n==> $m" -ForegroundColor Magenta }

Write-Host "`n  Envirr LMS - local launcher`n" -ForegroundColor White

# -- Stop mode ----------------------------------------------------------------
if ($Down) {
    Step "Stopping the stack"
    docker compose down
    Ok "Stopped."
    return
}

# -- 1. Docker present + running ----------------------------------------------
Step "Checking Docker"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Warn "Docker is not installed. Install Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Warn "Docker is installed but the daemon isn't running. Start Docker Desktop and re-run."
    exit 1
}
Ok "Docker is running."

# -- 2. Ensure .env -----------------------------------------------------------
Step "Checking environment file"
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Ok "Created .env from .env.example (AI keys are blank - add them for AI features)."
} else {
    Ok ".env already exists - leaving it untouched."
}

# -- 3. Build + start ---------------------------------------------------------
Step "Starting containers (this can take a few minutes on first run)"
if ($Rebuild) {
    docker compose build --no-cache
    if ($LASTEXITCODE -ne 0) { Warn "Build failed."; exit 1 }
}
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { Warn "Failed to start containers."; exit 1 }
Ok "Containers started."

# -- 4. Wait for Postgres -----------------------------------------------------
Step "Waiting for the database"
$ready = $false
foreach ($i in 1..30) {
    docker compose exec -T db pg_isready -U postgres *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) { Warn "Database did not become ready in time."; exit 1 }
Ok "Database is ready."

# -- 5. Migrate / seed / demo accounts ----------------------------------------
Step "Applying database migrations"
docker compose exec -T web python manage.py migrate --noinput
if ($LASTEXITCODE -ne 0) { Warn "Migrations failed."; exit 1 }
Ok "Migrations applied."

Step "Seeding demo course content (skips if already present)"
docker compose exec -T web python manage.py seed_all

Step "Creating demo login accounts"
docker compose exec -T web python manage.py create_demo_users

# -- 6. Done ------------------------------------------------------------------
Step "Ready"
Ok "Frontend:      http://127.0.0.1:5173"
Ok "API:           http://127.0.0.1:8000/api/"
Ok "Django admin:  http://127.0.0.1:8000/admin/"
Write-Host ""
Info "Demo logins (password: Envirr@Demo123):"
Info "   student -> demo_student     teacher -> demo_teacher     admin -> demo_admin"
Write-Host ""
Warn "Open http://127.0.0.1:5173 (use 127.0.0.1, not localhost). Stop with: .\scripts\run.ps1 -Down"
Write-Host ""
