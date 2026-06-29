#!/usr/bin/env bash
# One-click production deploy for Envirr LMS (macOS / Linux / any Docker host).
#
# Builds + starts the self-contained prod stack (docker-compose.deploy.yml): one
# web image serves the built SPA + Django API same-origin via gunicorn+WhiteNoise,
# with Postgres, Redis and a Celery worker. Migrations + collectstatic run on start.
#
# Requires .env.production (from .env.production.example). Refuses the placeholder key.
#
#   ./scripts/deploy.sh           # build + deploy
#   ./scripts/deploy.sh --down    # stop the production stack
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
COMPOSE="docker-compose.deploy.yml"

green(){ printf '  \033[32m%s\033[0m\n' "$1"; }
yellow(){ printf '  \033[33m%s\033[0m\n' "$1"; }
step(){ printf '\n\033[35m==> %s\033[0m\n' "$1"; }

printf '\n  Envirr LMS — production deploy\n'

if [ "${1:-}" = "--down" ]; then
  step "Stopping the production stack"; docker compose -f "$COMPOSE" down; green "Stopped."; exit 0
fi

# ── 1. Docker ──────────────────────────────────────────────────────────────────
step "Checking Docker"
command -v docker >/dev/null 2>&1 || { yellow "Docker not installed."; exit 1; }
docker info >/dev/null 2>&1 || { yellow "Docker daemon isn't running."; exit 1; }
green "Docker is running."

# ── 2. .env.production ─────────────────────────────────────────────────────────
step "Checking .env.production"
if [ ! -f .env.production ]; then
  cp .env.production.example .env.production
  yellow "Created .env.production from the template."
  yellow "Fill in SECRET_KEY, ALLOWED_HOSTS, DB password, API keys — then re-run."
  yellow "Generate a key: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
  exit 1
fi
if grep -qE "REPLACE_WITH_GENERATED_KEY|django-insecure" .env.production; then
  yellow "SECRET_KEY is still the placeholder. Set a real key in .env.production before deploying."
  exit 1
fi
green ".env.production present and SECRET_KEY looks set."

# ── 3. Build + start ───────────────────────────────────────────────────────────
step "Building production images (first build installs LaTeX — can take several minutes)"
docker compose -f "$COMPOSE" build
green "Images built."

step "Starting the stack (migrate + collectstatic run automatically)"
docker compose -f "$COMPOSE" up -d
green "Stack is up."

# ── 4. Health ──────────────────────────────────────────────────────────────────
step "Waiting for the web service"
PORT="${PORT:-8000}"
healthy=false
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/metadata/" >/dev/null 2>&1; then healthy=true; break; fi
  sleep 3
done

step "Deployed"
if [ "$healthy" = true ]; then green "App responding at http://127.0.0.1:${PORT}/"
else yellow "Web service not confirmed yet — check: docker compose -f $COMPOSE logs -f web"; fi
printf '\n'
green "Behind a domain: point your reverse proxy at port ${PORT} and set ALLOWED_HOSTS + FRONTEND_URL in .env.production."
green "Create an admin:  docker compose -f $COMPOSE exec web python manage.py createsuperuser"
green "Stop:            ./scripts/deploy.sh --down"
printf '\n'
