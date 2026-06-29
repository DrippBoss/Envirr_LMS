<#
.SYNOPSIS
    One-click production deploy for Envirr LMS (Windows / PowerShell).

.DESCRIPTION
    Builds and starts the self-contained production stack (docker-compose.deploy.yml):
    a single web image serves the built React SPA + Django API same-origin via
    gunicorn + WhiteNoise, alongside Postgres, Redis and a Celery worker. The web
    container migrates + collectstatic on start.

    Requires .env.production (copied from .env.production.example and filled in).
    Refuses to deploy with the placeholder SECRET_KEY.

.EXAMPLE
    .\scripts\deploy.ps1
    .\scripts\deploy.ps1 -Down     # stop the production stack
#>
param([switch]$Down)

# 'Continue' (not 'Stop'): native tools write harmless warnings to stderr, which
# under 'Stop' would be promoted to terminating errors in Windows PowerShell.
# Every native call below is guarded by $LASTEXITCODE.
$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$Compose = "docker-compose.deploy.yml"

function Ok($m)   { Write-Host "  $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  $m" -ForegroundColor Yellow }
function Step($m) { Write-Host "`n==> $m" -ForegroundColor Magenta }

Write-Host "`n  Envirr LMS - production deploy`n" -ForegroundColor White

if ($Down) {
    Step "Stopping the production stack"
    docker compose -f $Compose down
    Ok "Stopped."
    return
}

# -- 1. Docker ----------------------------------------------------------------
Step "Checking Docker"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Warn "Docker not installed."; exit 1 }
docker info *> $null
if ($LASTEXITCODE -ne 0) { Warn "Docker daemon isn't running."; exit 1 }
Ok "Docker is running."

# -- 2. .env.production -------------------------------------------------------
Step "Checking .env.production"
if (-not (Test-Path ".env.production")) {
    Copy-Item ".env.production.example" ".env.production"
    Warn "Created .env.production from the template."
    Warn "Fill in SECRET_KEY, ALLOWED_HOSTS, DB password, API keys - then re-run."
    Warn "Generate a key with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
    exit 1
}
if (Select-String -Path ".env.production" -Pattern "REPLACE_WITH_GENERATED_KEY|django-insecure" -Quiet) {
    Warn "SECRET_KEY is still the placeholder. Set a real key in .env.production before deploying."
    exit 1
}
Ok ".env.production present and SECRET_KEY looks set."

# -- 3. Build + start ---------------------------------------------------------
Step "Building production images (first build installs LaTeX - can take several minutes)"
docker compose -f $Compose build
if ($LASTEXITCODE -ne 0) { Warn "Build failed."; exit 1 }
Ok "Images built."

Step "Starting the stack (migrate + collectstatic run automatically)"
docker compose -f $Compose up -d
if ($LASTEXITCODE -ne 0) { Warn "Failed to start."; exit 1 }
Ok "Stack is up."

# -- 4. Health ----------------------------------------------------------------
Step "Waiting for the web service"
$port = if ($env:PORT) { $env:PORT } else { "8000" }
$healthy = $false
foreach ($i in 1..30) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/metadata/" -UseBasicParsing -TimeoutSec 4
        if ($r.StatusCode -ge 200) { $healthy = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}

Step "Deployed"
if ($healthy) { Ok "App responding at http://127.0.0.1:$port/" }
else { Warn "Web service not confirmed yet - check: docker compose -f $Compose logs -f web" }
Write-Host ""
Ok "Behind a domain: point your reverse proxy at port $port and set ALLOWED_HOSTS + FRONTEND_URL in .env.production."
Ok "Create an admin:  docker compose -f $Compose exec web python manage.py createsuperuser"
Ok "Stop:             .\scripts\deploy.ps1 -Down"
Write-Host ""
