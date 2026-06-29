#!/usr/bin/env bash
# One-click local launcher for Envirr LMS (macOS / Linux).
#
# Brings the whole stack up: checks Docker, creates .env, builds + starts all
# containers, waits for Postgres, migrates, seeds demo content (if empty), and
# creates demo login accounts. Safe to re-run.
#
#   ./scripts/run.sh            # start everything
#   ./scripts/run.sh --rebuild  # force a clean image rebuild
#   ./scripts/run.sh --down     # stop the stack
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

cyan(){ printf '  \033[36m%s\033[0m\n' "$1"; }
green(){ printf '  \033[32m%s\033[0m\n' "$1"; }
yellow(){ printf '  \033[33m%s\033[0m\n' "$1"; }
step(){ printf '\n\033[35m==> %s\033[0m\n' "$1"; }

printf '\n  Envirr LMS — local launcher\n'

# ── Stop mode ────────────────────────────────────────────────────────────────
for arg in "$@"; do
  if [ "$arg" = "--down" ]; then
    step "Stopping the stack"; docker compose down; green "Stopped."; exit 0
  fi
done

# ── 1. Docker present + running ───────────────────────────────────────────────
step "Checking Docker"
if ! command -v docker >/dev/null 2>&1; then
  yellow "Docker is not installed. Install Docker Desktop / Docker Engine first."; exit 1
fi
if ! docker info >/dev/null 2>&1; then
  yellow "Docker is installed but the daemon isn't running. Start Docker and re-run."; exit 1
fi
green "Docker is running."

# ── 2. Ensure .env ─────────────────────────────────────────────────────────────
step "Checking environment file"
if [ ! -f .env ]; then
  cp .env.example .env
  green "Created .env from .env.example (AI keys are blank — add them for AI features)."
else
  green ".env already exists — leaving it untouched."
fi

# ── 3. Build + start ───────────────────────────────────────────────────────────
step "Starting containers (first run can take a few minutes)"
for arg in "$@"; do
  if [ "$arg" = "--rebuild" ]; then docker compose build --no-cache; fi
done
docker compose up -d --build
green "Containers started."

# ── 4. Wait for Postgres ─────────────────────────────────────────────────────
step "Waiting for the database"
ready=false
for _ in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 2
done
[ "$ready" = true ] || { yellow "Database did not become ready in time."; exit 1; }
green "Database is ready."

# ── 5. Migrate / seed / demo accounts ──────────────────────────────────────────
step "Applying database migrations"
docker compose exec -T web python manage.py migrate --noinput
green "Migrations applied."

step "Seeding demo course content (skips if already present)"
docker compose exec -T web python manage.py seed_all

step "Creating demo login accounts"
docker compose exec -T web python manage.py create_demo_users

# ── 6. Done ──────────────────────────────────────────────────────────────────
step "Ready"
green "Frontend:      http://127.0.0.1:5173"
green "API:           http://127.0.0.1:8000/api/"
green "Django admin:  http://127.0.0.1:8000/admin/"
printf '\n'
cyan  "Demo logins (password: Envirr@Demo123):"
cyan  "   student → demo_student     teacher → demo_teacher     admin → demo_admin"
printf '\n'
yellow "Open http://127.0.0.1:5173 (use 127.0.0.1, not localhost). Stop with: ./scripts/run.sh --down"
printf '\n'
