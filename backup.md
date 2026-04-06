# Checkpoint 1: Stable Local Llama 3 & Question Bank Migration

This document serves as a "Stable Ground" snapshot of the Envirr LMS migration. If future changes break the AI pipeline or PDF generation, revert to the logic described here.

## 1. Core Architecture Status
- **Backend**: Django 6.0 + Celery + Redis.
- **AI Engine**: Local Ollama (running `llama3:latest`) accessible via `host.docker.internal:11434`.
- **Database**: PostgreSQL (port 5433). QuestionBank is the "Single Source of Truth."
- **Document Engine**: `pdflatex` (TeX Live) running inside the `celery_worker` container.

## 2. Key Files & Logic Snapshots

### AI Generation Loop (`ai_engine/tasks.py`)
- **Synthesis Logic**: Checks DB for existing questions first, then triggers Llama 3 for the deficit.
- **Math Sanitizer**: Intercepts `√`, `θ` etc., and wraps them in LaTeX `$ \sqrt{\quad} $` math mode.
- **JSON Extract**: Extracts strictly validated JSON arrays from Ollama's `response` key.

### Teacher Dashboard View (`ai_engine/views.py`)
- **Sync/Async Bridge**: Creating a `GeneratedPaper` record *before* calling Celery ensures the UI can show a "Synthesizing" placeholder immediately.
- **History API**: `GET /api/ai/generate-paper/` returns a list of papers with `pdf_url`.

### Frontend Result List (`TeacherPanel.tsx`)
- **State**: Uses `useEffect` with a 5-second polling interval to refresh the papers list.
- **Download**: Points directly to `http://localhost:8000/media/temp/paper_ID.pdf`.

## 3. Configuration Highlights
- **Settings**: `MEDIA_URL = '/media/'` and `MEDIA_ROOT` configured for PDF serving.
- **Docker**: `web` and `celery_worker` are linked and sharing the `/app` volume for access to the `temp/` folder.

## 4. Verification Steps (The "Green" State)
1. Login as `admin`/`admin`.
2. Navigate to Teacher Panel.
3. Input: Mathematics, Chapter 1, 80 Marks.
4. Click "Compile."
5. **Expected**: A new row appears in "My Generated Papers" saying "Synthesizing..."
6. **Expected**: After ~60 seconds, button changes to "Download PDF."

---
**Date**: 2026-04-06
**Status**: STABLE (Checkpoint 1)
