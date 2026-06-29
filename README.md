[![Auto Sanity Check](https://github.com/DrippBoss/Envirr_LMS/actions/workflows/auto-sanity-check.yml/badge.svg)](https://github.com/DrippBoss/Envirr_LMS/actions/workflows/auto-sanity-check.yml)

# Envirr LMS

A gamified learning-management platform for Indian secondary students (grades 9–12).
Django REST + Celery + PostgreSQL backend, React + TypeScript (Vite) frontend, all in Docker.

---

## 🚀 Quick start (run locally — one click)

You only need [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

**Windows** — double-click **`run.bat`**, or in a terminal:

```powershell
.\scripts\run.ps1
```

**macOS / Linux:**

```bash
./scripts/run.sh
```

That single command will:

1. check Docker is running,
2. create `.env` from `.env.example` (first run only),
3. build + start every service (db, redis, web, celery, frontend),
4. run migrations, seed demo course content (only if empty), and create demo logins,
5. print the URLs and credentials.

Then open **http://127.0.0.1:5173** (use `127.0.0.1`, not `localhost`).

**Demo logins** (password `Envirr@Demo123`):

| Role    | Username        |
|---------|-----------------|
| Student | `demo_student`  |
| Teacher | `demo_teacher`  |
| Admin   | `demo_admin`    |

Stop everything with `./scripts/run.sh --down` (or `.\scripts\run.ps1 -Down`).
Force a clean rebuild with `--rebuild` / `-Rebuild`.

> AI features (tutor, paper generation, bulk ingestion) need API keys — add
> `GEMINI_API_KEY` / `GROQ_API_KEY` to `.env`. The app runs fine without them.

---

## 🌐 Deploy to a host (one click)

The production image (`Dockerfile.prod`) builds the React SPA and serves it
**same-origin** with the API via gunicorn + WhiteNoise — one container, one port.

```bash
cp .env.production.example .env.production   # then fill in every value
./scripts/deploy.sh                          # Linux/macOS  (or scripts\deploy.ps1 on Windows)
```

`deploy.sh` validates `.env.production` (refuses the placeholder `SECRET_KEY`),
builds the prod images, and starts the stack from **`docker-compose.deploy.yml`**
(web + Postgres + Redis + Celery). Migrations and `collectstatic` run automatically.
The app is served on port `8000` — point your domain's reverse proxy / load
balancer at it and set `ALLOWED_HOSTS` + `FRONTEND_URL` in `.env.production`.

Create an admin user:

```bash
docker compose -f docker-compose.deploy.yml exec web python manage.py createsuperuser
```

For platform-as-a-service (Render/Railway/Fly), `render.yaml` and `Dockerfile.prod`
deploy the same single-service image directly.

---

## 🧪 Tests

```bash
# Backend (62 tests)
docker compose exec web python manage.py test

# Frontend E2E (Playwright — needs the app running + frontend/.env.test)
cd frontend && npm test
```

See `QA_AUDIT.md` for the current quality status and `frontend/tests/` for the
end-to-end suite (also runnable via the `/intent-test` skill).

---

## 📂 Project layout

| Path | What |
|------|------|
| `learning/` | Core LMS models (LearningNode, LearningPath, NodeProgress, …) + student/teacher APIs |
| `users/` | Custom user model with `role` (admin/teacher/student), auth, profiles |
| `ai_engine/` | AI question generation, QuestionBank, doubts, bulk ingestion, Celery tasks |
| `gamification/` | XP, streaks, leaderboard |
| `frontend/src/pages/` | React pages (StudentDashboard, LearningMap, TeacherPanel, AdminDashboard, …) |
| `scripts/` | One-click `run` + `deploy` launchers |

The `Auto Sanity Check` workflow runs every hour (and on PRs): backend tests,
frontend build, and lint. On failure it opens/updates a tracking GitHub issue.
