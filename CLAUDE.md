# Envirr LMS — Claude Code Instructions

## Project Overview
This is the Envirr LMS platform — a Django REST + React Vite application running in Docker.
- **Backend**: Django 4.x, DRF, Celery, PostgreSQL — at `http://localhost:8000`
- **Frontend**: React + TypeScript (Vite) — at `http://localhost:5173`
- **Docker**: Use `docker-compose up` to start. Backend container is `envirr_lms-web-1`, frontend is `envirr_lms-frontend-1`

## Key Directories
- `learning/` — Core LMS models: LearningNode, LearningPath, NodeProgress, RevisionNode
- `users/` — Custom User model with `role` field (admin/teacher/student), StudentProfile
- `ai_engine/` — AI question generation, QuestionBank, Celery tasks
- `gamification/` — XP, Streaks, Leaderboard
- `frontend/src/pages/` — React pages: NodePage, LearningMap, TeacherPanel, StudentDashboard
- `frontend/src/components/` — QuestionCard, FlashcardModal, NodeCard, RevisionNodeCard

## Skills

- **graphify** (`C:\Users\Abhi1\.claude\skills\graphify\SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
