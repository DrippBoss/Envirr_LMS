# Envirr LMS — Knowledge Base
> Last full audit: 2026-06-07

---

## 1. Product Overview

**Envirr LMS** is a Django REST + React Vite educational platform for Indian secondary students (grades 9–12).

- **Backend**: Django 4.x, DRF, Celery, PostgreSQL — `http://localhost:8000`
- **Frontend**: React 18 + TypeScript (Vite) — `http://localhost:5173`
- **AI Engine**: Groq (cloud) for question generation/ingestion; Ollama (LLaMA 3, local) for AI Tutor chat
- **Auth**: JWT via httpOnly cookies (access 8h, refresh 14d) — migrated away from localStorage tokens
- **Docker containers**: `envirr_lms-web-1`, `envirr_lms-frontend-1`, `envirr_lms-db-1`, `envirr_lms-redis-1`, `envirr_lms-celery_worker-1`

---

## 2. User Roles & Permissions

| Role | Access |
|------|--------|
| **admin** | Full system access, user management, analytics, course approval |
| **teacher** | Course building (`can_build_courses`), question editing (`can_edit_questions`), paper generation — permissions toggled by admin |
| **student** | Learning flow, mock tests, study groups, AI tutor |

`CustomUser.can_build_courses` and `CustomUser.can_edit_questions` are separate flags on teachers that admins toggle independently.

---

## 3. Database Schema

### App: `users`

**CustomUser** (extends AbstractUser)
- `role` — admin / teacher / student
- `name`, `mobile`, `email` (unique), `email_verified`, `pending_email`
- `can_build_courses`, `can_edit_questions` — teacher permission flags
- `failed_login_attempts` — auto-locked after 10 failures
- `assigned_subjects` — JSONField (list of subjects scoped to teacher)

**StudentProfile** — auto-created via signal when `role='student'`
- `user` (OneToOne), `class_grade` (9-12), `board` (CBSE/ICSE/State/Other), `avatar_url`

**EmailVerificationToken** — 24h expiry, tracks `send_count` (max 5 resends)
- Handles both initial verification and email-change flow (`new_email` field)

**BannedIP** — IP-level block, tracked with `banned_by` FK to admin

---

### App: `learning` (core LMS)

**ContentTemplate** — Stores JSON config for node/question defaults (used by wizard)

**CourseUnit** → many **LearningPath** → many **LearningNode**
- `CourseUnit`: `title`, `subject`, `class_grade`, `board`, `order`, `icon`, `description`, `is_published`, `assigned_teacher`
- `LearningPath`: `unit` (FK), `title`, `class_grade`, `is_active`
- `LearningNode`: `path`, `title`, `node_type` (LESSON/CHAPTER_TEST/LAB), `order`, `xp_reward`, `youtube_url`, `video_file`, `practice_question_count`, `starting_lives`, `test_question_count`, `test_pass_percentage`, `question_filter` (JSONField → used as `**kwargs` ORM filter), `lab_type`, `lab_category`, `lab_required_completions`, `unlock_min_stars`, `objectives_json`
  - `unique_together: [['path', 'order']]`

**LessonQuestion** — Questions attached to nodes
- `question_type`: MCQ / FILL_BLANK / TRUE_FALSE / MATCH / PROOF_PUZZLE / REARRANGE / MULTI_SELECT / SHORT_ANSWER / LONG_ANSWER
- `options_json`, `correct_answer`, `hint`, `explanation`, `concept`
- `source_question` FK → `ai_engine.QuestionBank` (optional link)
- `has_image`, `image`, `image_description`

**NodeProgress** — per (student, node) tuple
- `status`: LOCKED → UNLOCKED → IN_PROGRESS → COMPLETED / FAILED
- `current_step`: NOT_STARTED / VIDEO_DONE / PRACTICE / COMPLETED
- `lives_remaining`, `best_score`, `attempts`, `stars`, `xp_earned`
- `flashcard_shown`, `lab_artifact`

**SessionAnswer** — records every answer; `save()` auto-creates/updates **WeakSpot** on wrong answer

**WeakSpot** — `(student, concept, subject, chapter)` unique; `wrong_count`, `is_resolved`

**Flashcard** — `card_type`: CONCEPT/FORMULA/EXAMPLE/MNEMONIC/SUMMARY; `has_formula`, `formula_text`, `example_text`

**FlashcardDeck** → many **Flashcard** (via **DeckCard** with `order`)
- `purpose`: PREREQUISITE / POST_NODE / SIDE_REVISION
- FKs to: `CourseUnit`, `LearningNode`, `RevisionNode`

**RevisionNode** — side-content after completing a main node
- `path`, `appears_after_node` (FK → LearningNode), `side` (left/right), `xp_reward`, `is_mandatory`

**RevisionNodeProgress**, **FlashcardProgress**, **UnitPrerequisiteSeen** — progress tracking

**StudyGroup** — 6-char `invite_code` (auto-generated), `max_members` (default 10, MAX_MEMBERS const = 6 — inconsistency!), `creator`, `is_active`

**StudyGroupMember** — `role` (admin/member), `violation_count`, `muted_until`

**GroupSession** — `session_type` (questions/pdf), `question_ids` (JSONField), `source` (ai_generated/teacher_paper), `status` (waiting/active/completed), `time_limit`

**GroupSessionProgress** — per (session, student); `answers` (JSONField), `submitted`, `score`

**GroupChatMessage** — `message`, `image`, `question_number`, `is_doubt`, `is_system`

**GroupDoubt** — per (session, question_number); `escalated_to_ai`, `escalated_to_teacher`, `ai_response`

**ChatModerationEvent** — blocked profanity/contact info with `reason`

**MockTestAttempt** — `subject`, `chapters`, `question_ids`, `answers`, `results`, `score`, `total`, `time_taken`, `completed`

---

### App: `ai_engine`

**QuestionBank** — central question repository
- `question_type`: MCQ / ASSERTION_REASON / VERY_SHORT / SHORT / LONG / CASE / REARRANGE
- `marks` (1-20), `difficulty`, `bloom_level`
- `question_hash` (unique) — SHA256 of (subject + chapter + question_text); does NOT include question_type
- `is_ai_generated`, `is_verified`, `times_used`
- `source_document` FK → `SourceDocument`
- Indexes: `idx_question_filter`, `idx_ai_quality`, `idx_bloom`

**MCQOption** — `(question, option_label)` unique; `is_correct`, `order`

**CaseStudyPart** — sub-parts for CASE questions; `(parent_question, part_number)` unique

**SourceDocument** — PDF ingestion tracker; `status`: pending/processing/done/failed; `file_hash` unique

**QuestionPaper** — `config`, `secure_pdf_path`, `share_link` (unique), `title`, `subject`, `class_grade`, `total_marks`, `duration_mins`, `is_template`

**PaperSection** → **PaperQuestion** (FKs to QuestionBank)
- `PaperQuestion.save()` increments `QuestionBank.times_used`

**FailedIngestion** — failed PDF attempt; `raw_json`, `error_reason`, `is_resolved`

**DoubtTicket** / **DoubtResponse** — student Q&A; `DoubtTicket.lesson` FKs to `courses.Lesson` (legacy app — not integrated with `learning` app)

---

### App: `gamification`

**Streak** (OneToOne → CustomUser): `current_streak`, `longest_streak`, `last_activity_date`, `is_broken`

**StudentXP** (OneToOne → CustomUser): `total_xp`, `current_level`, `xp_history` (JSONField)
- Level formula: `current_level = max(1, total_xp // 500 + 1)` — no upper bound

**Badge**, **StudentBadge** — `(student, badge)` unique; `earned_at`

---

### App: `activity` (legacy, references old `courses` app)

**StudentEnrollment** → `courses.Course`
**UnitCompletion** → `courses.Unit`
**QuizSubmission** → `courses.Quiz`

> These models reference the legacy `courses` app (Subject → Course → Unit → Lesson → Quiz → QuizQuestion) which is NOT the same as the `learning` app. Integration is incomplete.

---

## 4. API Endpoints

### Auth (`/api/auth/`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `login/` | POST | Any | Cookie-based JWT; tracks failed attempts; locks after 10 |
| `token/refresh/` | POST | Any | Refresh access token from cookie |
| `register/` | POST | Any | Create user + StudentProfile |
| `logout/` | POST | Any | Clear auth cookies |
| `me/` | GET/PATCH | Auth | Current user + profile |
| `change-password/` | POST | Auth | Validate old, set new, issue fresh tokens |
| `send-verification/` | POST | Auth | Send/resend email verification (max 5) |
| `verify-email/` | GET/POST | Any | GET=pre-check (scanner safe); POST=consume token |
| `admin/analytics/` | GET | Admin | KPI: user counts, qbank stats, recent papers |
| `admin/users/<id>/toggle-course-builder/` | POST | Admin | Flip `can_build_courses` |
| `admin/users/<id>/toggle-question-editor/` | POST | Admin | Flip `can_edit_questions` |
| `admin/users/<id>/toggle-status/` | POST | Admin | Flip `is_active`, resets failed attempts |
| `admin/users/<id>/delete/` | DELETE | Admin | Hard delete (non-admin only) |
| `admin/users/<id>/assign-subjects/` | POST | Admin | Set `assigned_subjects` list |

### Student Flow (`/api/student/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `dashboard/` | GET | Published CourseUnits for student's grade |
| `weak-concepts/` | GET | Top 8 unresolved WeakSpots |
| `activity/` | GET | Last 6 unique nodes from SessionAnswer |
| `units/<id>/prerequisites/` | GET/POST | GET: prereq deck or status; POST: mark seen → unlock first node |
| `paths/<id>/map/` | GET | LearningPath + nodes + revision_nodes + progress |
| `nodes/<id>/start/` | POST | → video_url, step, breadcrumb, description, node_type |
| `nodes/<id>/video-complete/` | POST | Mark video watched; transition to PRACTICE |
| `nodes/<id>/practice/` | GET | Shuffled questions for practice |
| `nodes/<id>/practice/answer/` | POST | Grade answer; reduce lives; create SessionAnswer |
| `nodes/<id>/practice/retry/` | POST | Reset lives, increment attempts |
| `nodes/<id>/practice/complete/` | POST | Complete node; stars, XP, next unlock |
| `nodes/<id>/revision-cards/` | GET | Post-node flashcards (3 cards max) |
| `nodes/<id>/test/start/` | POST | Pull from QuestionBank using `question_filter` |
| `nodes/<id>/test/complete/` | POST | Submit score; pass if ≥ test_pass_percentage |
| `nodes/<id>/lab/complete/` | POST | Submit lab artifact; award XP |
| `revision-nodes/<id>/` | GET/POST | GET: personalized deck; POST: mark complete |
| `flashcards/<id>/seen/` | POST | Mark card seen/known |
| `mock-test/generate/` | POST | Generate attempt from QuestionBank + WeakSpots |
| `mock-test/<id>/submit/` | POST | Submit answers; calculate score |
| `mock-test/history/` | GET | Past MockTestAttempts |
| `study-groups/` | GET/POST | List/create study groups |
| `study-groups/join/` | POST | Join via invite_code |
| `study-groups/<id>/` | GET/DELETE | Group detail |
| `study-groups/<id>/sessions/` | POST | Create GroupSession |
| `study-groups/<id>/sessions/<sid>/` | GET | Session detail |
| `study-groups/<id>/sessions/<sid>/save/` | POST | Save in-progress answers |
| `study-groups/<id>/sessions/<sid>/submit/` | POST | Submit for grading |
| `study-groups/<id>/sessions/<sid>/results/` | GET | Session results |
| `study-groups/<id>/sessions/<sid>/chat/` | GET/POST | Group chat (moderated) |
| `study-groups/<id>/sessions/<sid>/answer-key/` | GET | Reveal correct answers |
| `study-groups/<id>/sessions/<sid>/doubts/` | GET/POST | Per-question doubts |
| `study-groups/<id>/sessions/<sid>/doubts/<q>/escalate/` | POST | Escalate to AI/teacher |
| `study-groups/<id>/sessions/<sid>/moderation/` | GET | Moderation log |
| `study-groups/discover/` | GET | Browse active sessions |
| `study-groups/leaderboard/<id>/` | GET | Group-level leaderboard |

### AI Engine (`/api/ai/`)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `generate-paper/` | GET/POST | Teacher/Admin | List recent papers; async Celery generation |
| `generate-paper/<pk>/download/` | GET | Owner | Download PDF |
| `questions/` | GET | Auth | Filter QuestionBank (subject/chapter/type) |
| `questions/meta/` | GET | Auth | Subjects/chapters; scoped by teacher's assigned_subjects |
| `questions/editor/` | GET | Auth | Paginated Q-bank for editor (page_size=20) |
| `questions/<pk>/` | GET/PATCH/DELETE | can_edit_questions or Admin | View/edit/delete question |
| `questions/<pk>/options/` | POST | can_edit_questions | Update MCQ options |
| `manual-paper/` | POST | Teacher/Admin | Compile paper from manually selected questions |
| `tutor/` | POST | Auth (30/hour) | Socratic AI tutor via Ollama; strips prompt injection |
| `ingest-upload/` | POST | Teacher/Admin | Upload PDF → Groq vision extraction → question pool |
| `ingest-upload/detect/` | POST | Teacher/Admin | Auto-detect subject/chapter/grade/board/difficulty |
| `ingest-upload/gap-fill/` | POST | Teacher/Admin | AI-generate questions to fill gaps |
| `ingest-upload/compile/` | POST | Teacher/Admin | Compile ingested questions into QuestionPaper |

### Teacher/Wizard (`/api/teacher/`)
Powered by `learning/wizard_views.py`:
| Endpoint | Auth | Description |
|----------|------|-------------|
| `courses/templates/` | Admin | List ContentTemplates |
| `courses/create/` | Teacher/Admin | Create course via wizard |
| `courses/pending/` | Admin | Pending approval queue |
| `courses/<id>/review/` | Admin | Approve/reject |
| `courses/<id>/assign/` | Admin | Assign teacher |
| `courses/assigned/` | Teacher/Admin | Courses assigned to current teacher |
| `courses/<id>/structure/` | Teacher/Admin | GET/PUT node structure |
| `courses/reorder/` | Admin | Bulk reorder |
| `courses/bulk-upload/` | Admin | CSV/JSON upload |
| `teachers/` | Admin | List all teachers |

### Gamification (`/api/gamification/`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `stats/` | GET | Streak, XP, badges for current user |
| `leaderboard/` | GET | Top 50 same-grade students ranked by XP |

---

## 5. Core Service Logic

### `learning/services.py`

**`unlock_next_nodes(student_profile, completed_node)`**
- Finds next sequential node (skips labs unless threshold met)
- Checks `unlock_min_stars` gate (student's stars on current node)
- Creates NodeProgress (UNLOCKED) for next node
- Also unlocks labs when `lab_required_completions` threshold met
- Wrapped in `atomic()`

**`award_node_xp(student_profile, node, xp_amount, is_test)`**
- Updates Streak: increments if new day, tracks `longest_streak`
- Updates StudentXP: `current_level = max(1, total_xp // 500 + 1)` — no level cap
- Appends entry to `xp_history` JSONField
- Calls `check_and_award_badges()`
- Uses `select_for_update()` on Streak + StudentXP — safe from race conditions ✓

**`calculate_stars(wrong_count, total_questions)`**: 0 wrongs → 3★, ≤2 → 2★, else → 1★

**`get_personalised_revision_deck`** / **`get_post_node_cards`**: Sorts deck cards by WeakSpot match first (prioritised review)

---

### `ai_engine/tasks.py` (Celery)

**`generate_paper_task(config, user_id, paper_id)`**
- Parses chapter entries: "Chapter", "Chapter: Topic", "Chapter > Topic"
- Fetches questions from QuestionBank, fills gaps via Groq API
- Builds LaTeX, converts Unicode math symbols, compiles via `pdflatex`
- Saves PDF to `QuestionPaper.secure_pdf_path`
- **No try/catch around pdflatex or Groq calls — failures are silent**

**`compile_manual_paper_task`** — same pipeline for manually-configured papers

**`process_latex_text(text)`** — escapes LaTeX special chars outside math; converts Unicode subscripts/superscripts/Greek

---

## 6. Frontend Architecture

### Routing (App.tsx)
```
/                → StudentDashboard (student)
/map/:pathId     → LearningMap
/node/:nodeId    → NodePage
/teacher         → TeacherPanel (teacher)
/admin           → AdminDashboard (admin)
/ai-tutor        → AiTutor
/course/:id      → CourseViewer
/mock-test       → MockTestPage
/leaderboard     → LeaderboardPage
/profile         → ProfilePage
/login           → Login
```
- `ProtectedRoute` checks `isAuthenticated` + optional `allowedRole`
- Admins bypass role check — can visit any role's page

### Auth (AuthContext.tsx)
- Base URL: `${VITE_API_URL}/api/` with `withCredentials: true`
- On load: `GET /api/auth/me/` → set user
- 401 interceptor: auto-retries `POST /api/auth/token/refresh/` once; on failure redirects via `window.location.href = '/login'` (bypasses React router)
- `login()` / `logout()` / `refreshUser()`

### Pages

| Page | File | Core APIs Called |
|------|------|-----------------|
| Login | Login.tsx | `POST auth/login/`, `POST auth/register/`, `POST auth/send-verification/` |
| StudentDashboard | StudentDashboard.tsx | `GET gamification/stats/`, `GET student/dashboard/`, `GET student/weak-concepts/`, `GET student/activity/`, `GET student/study-groups/` |
| LearningMap | LearningMap.tsx | `GET student/paths/:id/map/`, `GET/POST student/units/:id/prerequisites/`, `GET/POST student/revision-nodes/:id/` |
| NodePage | NodePage.tsx | `POST student/nodes/:id/start/`, `POST video-complete/`, `GET practice/`, `POST practice/answer/`, `POST practice/complete/`, `GET revision-cards/` |
| TeacherPanel | TeacherPanel.tsx | Course building; question management; `GET ai/questions/meta/` |
| AdminDashboard | AdminDashboard.tsx | `GET auth/admin/analytics/`, `GET teacher/courses/pending/`, `GET teacher/teachers/`, admin user management |
| AiTutor | AiTutor.tsx | `POST ai/tutor/` — history cached in localStorage (120-msg limit) |
| MockTestPage | MockTestPage.tsx | `GET ai/questions/meta/`, `POST student/mock-test/generate/`, `POST student/mock-test/:id/submit/` |
| CourseViewer | CourseViewer.tsx | `GET student/courses/:id/` |
| LeaderboardPage | LeaderboardPage.tsx | `GET gamification/leaderboard/` |
| ProfilePage | ProfilePage.tsx | `GET auth/me/`, `PATCH auth/me/` |

### Key Components

| Component | Purpose | Key Issue |
|-----------|---------|-----------|
| `QuestionCard` | MCQ / A-R / True-False / Rearrange | OPTION_LETTERS array only supports A-F |
| `FillBlankCard` | Fill-in-blank questions | Splits on `___` delimiter only |
| `MultiSelectCard` | Multi-select MCQ | Joins selected IDs with comma — backend format match needed |
| `ProofPuzzleCard` | Drag-and-drop proof steps | No logical validation of step sequence |
| `FlashcardModal` | Keyboard-navigable flip cards | Touch handler cleanup missing |
| `NodeCard` | Circular node with hover card | Lab colors hardcoded (#6366f1 etc.) |
| `CourseBuilder` | Wizard for creating/reordering nodes | Part of TeacherPanel |
| `QuestionEditor` | Inline Q-bank editor with image upload | Image URL objects not revoked (memory leak) |
| `UploadIngest` | 5-step paper generation wizard | Gap fill uses fixed timeouts, no exponential backoff |
| `Navbar` | Role-aware nav; theme toggle | Admin renders null (intentional) |
| `ThemeContext` | Light/dark toggle via localStorage | — |

---

## 7. Security Model

| Control | Implementation | Status |
|---------|---------------|--------|
| JWT storage | httpOnly cookies (migrated from localStorage) | ✓ Secure |
| Login rate limit | 10/hour via DRF throttle; account lock after 10 failures | ✓ |
| IP banning | `IPBanMiddleware` + `BannedIP` model | ✓ |
| Email verification | Token with 24h expiry; max 5 resends | ✓ |
| Role permissions | `IsStudent` / `IsTeacher` / `IsAdmin` DRF permission classes | ✓ |
| Feature flags | `can_build_courses`, `can_edit_questions` — admin-toggled | ✓ |
| AI prompt injection | Strip patterns in `AiTutorView` before Ollama call | ✓ |
| Chat moderation | Profanity + contact info detection; `ChatModerationEvent` log | ✓ |
| ALLOWED_HOSTS | `['*']` in settings | ✗ Not prod-ready |
| CORS | `CORS_ALLOW_ALL_ORIGINS = DEBUG` | Conditional ✓/✗ |
| Celery broker | `redis://localhost:6379/1` (hardcoded) | ✗ Use env var |

---

## 8. Docker & Infrastructure

| Container | Purpose |
|-----------|---------|
| `envirr_lms-web-1` | Django/DRF backend |
| `envirr_lms-frontend-1` | React Vite dev server |
| `envirr_lms-db-1` | PostgreSQL |
| `envirr_lms-redis-1` | Redis (Celery broker) |
| `envirr_lms-celery_worker-1` | Celery async tasks |

**External services:**
- **Groq API** (cloud): Question ingestion from PDFs, gap-fill generation
- **Ollama** (local, `host.docker.internal:11434`): AI Tutor via LLaMA 3

---

## 9. Key Files Reference

| File | Purpose |
|------|---------|
| `envirr_backend/settings.py` | Django settings, JWT config, CORS, Celery |
| `envirr_backend/exceptions.py` | Custom exception handlers |
| `users/models.py` | CustomUser, StudentProfile, BannedIP, EmailVerificationToken |
| `learning/models.py` | All learning + study group + mock test models |
| `learning/services.py` | XP, unlock, flashcard personalisation |
| `learning/wizard_views.py` | Admin course creation wizard views |
| `ai_engine/models.py` | QuestionBank, SourceDocument, QuestionPaper, MCQOption |
| `ai_engine/tasks.py` | Celery: paper generation, LaTeX pipeline |
| `gamification/models.py` | Streak, StudentXP, Badge |
| `activity/models.py` | Legacy enrollment/quiz tracking (references `courses` app) |
| `frontend/src/context/AuthContext.tsx` | JWT auth state + api client |
| `frontend/src/App.tsx` | Routes, ProtectedRoute |
| `frontend/src/pages/` | All page components |
| `frontend/src/components/` | Reusable UI components |
| `frontend/tailwind.config.js` | Design system tokens |
| `fix_ap_latex.py` | Standalone LaTeX fix script (purpose unclear — see QA doc) |
| `concerns.md` | Developer notes (not committed — check for context) |

---

## 10. Environment Variables

### Backend `.env`
```
SECRET_KEY=...
DEBUG=True/False
GROQ_API_KEY=...
DATABASE_URL=postgres://...
REDIS_URL=redis://...
EMAIL_HOST=...
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:8000
```
