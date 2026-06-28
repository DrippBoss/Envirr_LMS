# Envirr LMS — Product & Engineering Documentation

> A plain-language, end-to-end guide to what Envirr LMS is, how it is built, and
> how every feature works — written so that a new engineer, a teacher, an
> investor, or a curious student can all understand it. For each feature you'll
> find: **what it is**, **the technology behind it**, **the step-by-step
> workflow**, **the goal of the feature**, and **the long-term vision**.

_Last updated: 2026-06-28._

---

## 1. What is Envirr LMS?

Envirr LMS is a **gamified learning platform for Indian secondary-school students
(grades 9–12)**. Instead of presenting a static list of chapters, it turns a
syllabus into an **interactive "learning map"** — a path of lessons, hands-on
labs, and tests that a student unlocks one step at a time, earning XP, streaks,
and badges along the way. Teachers build the courses and generate exam papers;
admins manage the platform.

Think of it as **Duolingo-style progression applied to the CBSE/ICSE
curriculum**, with an AI tutor, collaborative study rooms, and AI-assisted
question/paper generation for teachers.

### Who uses it

| Role | What they do |
|------|--------------|
| **Student** | Learn through the curriculum, practice questions, take tests, use the AI tutor, join study groups, climb the leaderboard. |
| **Teacher** | Build courses, edit the question bank, generate exam papers (AI or manual), answer student doubts. Permissions (`can_build_courses`, `can_edit_questions`) are toggled per-teacher by an admin. |
| **Admin** | Full control: approve courses, manage users and permissions, view platform analytics, ban abusive IPs. |

---

## 2. Long-term vision & goals

**Vision:** become the default "practice and mastery" layer for Indian secondary
education — a place where a student's entire journey through a subject is
mapped, adaptive, and motivating, and where a teacher can stand up a
fully-interactive course (with auto-graded practice, labs, and exam papers) in
hours instead of weeks.

**Guiding goals:**

1. **Mastery over coverage.** Track *concepts*, not just chapters. The platform
   records every wrong answer as a "weak spot" and steers practice/revision back
   to those concepts.
2. **Motivation by design.** Streaks, XP, levels, badges and a peer leaderboard
   keep daily engagement high — the proven loop that keeps learners returning.
3. **Teacher leverage through AI.** Let one teacher serve many students: AI
   generates and gap-fills questions, builds exam papers as print-ready PDFs, and
   ingests existing PDFs into the question bank.
4. **Active, not passive, learning.** Interactive labs and proof-builders make
   abstract topics (irrationality proofs, coordinate geometry, quadratics)
   tangible.
5. **Social learning.** Moderated study rooms let students practice together and
   escalate doubts to the AI or a teacher.

---

## 3. Technology stack

### Backend
- **Python / Django 5+** with **Django REST Framework (DRF)** for the API.
- **SimpleJWT** for authentication, delivered as **httpOnly cookies** (not
  localStorage) for security.
- **Celery + Redis** for asynchronous jobs (exam-paper PDF generation, PDF
  ingestion). Redis also backs the **cache** (dashboard/leaderboard) and DRF
  **rate-limiting**.
- **PostgreSQL** as the primary database (SQLite is the local fallback).
- **LaTeX (`pdflatex`)** for rendering exam papers to PDF.

### Frontend
- **React 19 + TypeScript**, built with **Vite**.
- **TailwindCSS** design system (custom tokens: `surface`, `primary`, etc.).
- **React Router 7** for routing; all page routes are **lazy-loaded
  (code-split)** so the initial bundle stays small.
- **KaTeX + react-markdown** for rendering math and rich AI-tutor responses.

### AI services
- **Google Gemini** (`gemini-2.0-flash`) powers the **AI Tutor**.
- **Groq** powers **teacher tooling**: PDF question ingestion (vision
  extraction) and exam-paper question gap-filling.

### Infrastructure
- **Docker Compose** runs the whole stack: `web` (Django), `frontend` (Vite),
  `db` (Postgres), `redis`, and `celery_worker`.
- **GitHub Actions** ("Auto Sanity Check") runs backend tests + frontend build +
  lint on every pull request, hourly, and on demand.

### How the pieces talk
```
Browser (React/Vite :5173)
   │   │
   │  └── /api/* proxied ──► Django/DRF (:8000) ──► PostgreSQL
   │                              │  │
   │                              │  └── Celery ──► Redis ──► pdflatex (PDF)
   │                              │
   │                              ├── Gemini API   (AI tutor)
   │                              └── Groq API     (ingestion, paper gap-fill)
   └── httpOnly JWT cookies (access 1h / refresh 14d)
```

---

## 4. Core concepts (the data model in plain language)

Understanding five nouns explains almost the whole app:

- **CourseUnit** — a subject chapter for a grade/board (e.g. "Number Systems",
  Class 9, CBSE). What a student sees as a "course" on their dashboard.
- **LearningPath** — the ordered journey through a unit. A unit has one (or more)
  paths.
- **LearningNode** — a single step on the path. Three kinds:
  - `LESSON` — video + practice questions.
  - `LAB` — an interactive activity (e.g. a coordinate-grid explorer).
  - `CHAPTER_TEST` — a graded assessment pulled from the question bank.
- **NodeProgress** — a student's state on one node: `LOCKED → UNLOCKED →
  IN_PROGRESS → COMPLETED` (or `FAILED`), plus lives, stars, and XP earned.
- **QuestionBank** — the central, reusable repository of questions (used by
  chapter tests, mock tests, and exam-paper generation). Distinct from
  **LessonQuestion**, which are questions authored directly onto a lesson node
  for in-lesson practice.

Supporting concepts: **WeakSpot** (a concept the student keeps getting wrong),
**Flashcard / FlashcardDeck** (concept review cards), **RevisionNode**
(side-content after a node), **Streak / StudentXP / Badge** (gamification),
**StudyGroup / GroupSession** (collaborative practice), and **QuestionPaper**
(a generated exam).

---

## 5. Features — what they are and how they work

> Each feature below follows the same shape: **What → Technology → Workflow →
> Goal → Vision.**

### 5.1 Accounts & Authentication

**What:** Sign-up, email verification, login, password reset, and account
lockout.

**Technology:** DRF + SimpleJWT issued as httpOnly cookies (`access_token` 1h,
`refresh_token` 14d, `Secure` in production, `SameSite=Lax`). Email via Gmail
SMTP. Brute-force protection via DRF throttles + a per-account failure counter +
IP-ban middleware.

**Workflow:**
1. **Register** (`POST /api/auth/register/`) → a `CustomUser` is created; if the
   role is `student`, a `StudentProfile` is auto-created by a signal.
2. **Verify email** — a token (24h expiry, max 5 resends) is emailed; clicking
   the link verifies the account.
3. **Login** (`POST /api/auth/login/`) → on success the server sets the JWT
   cookies and returns `{message: "Login successful"}`. On a wrong password the
   per-user `failed_login_attempts` counter increments (under a row lock to
   prevent races); after **10** failures the account is locked (`is_active =
   False`).
4. **Stay logged in** — the frontend's API client auto-retries
   `POST /api/auth/token/refresh/` once on a 401, transparently refreshing the
   access token from the refresh cookie.
5. **Forgot password** — `POST /api/auth/password-reset/` emails a stateless,
   single-use, 2-hour reset link; `password-reset/confirm/` sets the new
   password.

**Goal:** keep accounts secure and recoverable without friction.

**Vision:** add social/Google sign-in and parent/teacher-linked accounts.

---

### 5.2 Curriculum (courses & learning paths)

**What:** The student's home for everything they're learning — the list of
courses for their grade and the path into each.

**Technology:** React `CurriculumPage` + `StudentDashboard`; backend
`DashboardView` returns published `CourseUnit`s filtered to the student's grade,
each annotated with a `progress_percentage` computed from their `NodeProgress`.

**Workflow:**
1. Student opens **Dashboard** (`/`) or **Curriculum** (`/curriculum`).
2. The page calls `GET /api/student/dashboard/` → published units for the
   student's grade, with progress bars.
3. Student picks a course → the app first checks the unit's **prerequisite deck**
   (`GET/POST /api/student/units/:id/prerequisites/`). If there are prerequisite
   flashcards and they haven't been seen, a review modal appears; otherwise the
   student is taken straight in.
4. Marking prerequisites seen **unlocks the first node** and navigates to the
   **Learning Map** (`/map/:pathId`), which renders the path's nodes and the
   student's progress on each.

**Goal:** make "what do I study next" obvious and grade-appropriate.

**Vision:** adaptive ordering — surface the unit/path the student most needs next
based on weak spots and upcoming exams.

---

### 5.3 The learning node flow (the heart of the app)

**What:** Working through a single lesson node: watch → practice → master →
unlock the next step.

**Technology:** `learning/views.py` (`NodeStartView`, `NodeVideoCompleteView`,
`NodePracticeView`, `NodePracticeAnswerView`, `NodePracticeCompleteView`) +
`learning/services.py` (`calculate_stars`, `award_node_xp`,
`unlock_next_nodes`). React `NodePage`.

**Workflow (step by step):**
1. **Start** (`POST /api/student/nodes/:id/start/`) — checks the node belongs to
   the student's grade, moves progress to `IN_PROGRESS`, and returns the video
   URL + objectives. If the node has **no video**, it auto-advances the step to
   `PRACTICE` (so practice isn't blocked).
2. **Watch video** → **`POST .../video-complete/`** moves the step to `PRACTICE`.
   (The backend refuses practice until the video step is done, preventing
   skipping.)
3. **Practice** (`GET .../practice/`) — returns the node's `LessonQuestion`s,
   shuffled. Question types include MCQ, fill-in-the-blank, true/false,
   multi-select, proof-puzzle (drag steps into order), and rearrange.
4. **Answer** (`POST .../practice/answer/` with `{question_id, given_answer}`) —
   the server grades it:
   - For MCQ the client sends the **option key** (e.g. `"C"`); the server matches
     it against the stored answer (handling both "answer stored as key" and
     "answer stored as text").
   - A wrong answer **costs a life**; running out of lives fails the attempt.
   - Every wrong answer creates/updates a **WeakSpot** for that concept; a correct
     answer on that concept decrements it (and resolves it at zero).
5. **Complete** (`POST .../practice/complete/`) — awards **stars** (3 for no
   wrong answers, 2 for ≤2, else 1), grants **XP**, updates the **streak**,
   checks for **badges**, and calls `unlock_next_nodes` to open the next step
   (subject to any `unlock_min_stars` gate).

**Goal:** enforce genuine learning (video before practice, lives create stakes)
while rewarding mastery.

**Vision:** spaced-repetition re-tests of mastered nodes and difficulty that
adapts to the learner.

---

### 5.4 Interactive Labs

**What:** Hands-on, in-browser activities — e.g. an HCF/LCM visualizer, a
coordinate-grid explorer, a √2-irrationality proof builder, a quadratic-roots
explorer (~24 labs).

**Technology:** Pure **client-side React components** in `frontend/src/labs/`,
lazily loaded and selected by a `lab_type` string through a `LabDispatcher`
registry. There is **no server-stored lab template** — the component *is* the
lab. The backend only records completion.

**Workflow:**
1. A `LAB` node returns its `lab_type` from the start endpoint.
2. `LabDispatcher` maps `lab_type` → the matching React component and renders it
   inside a shared `LabShell`.
3. The student interacts, then clicks **"Save & Finish Lab."**
4. The lab posts an **artifact** (a small JSON summary of what they did) to
   `POST /api/student/nodes/:id/lab/complete/`, which awards 3★ + XP and unlocks
   the next node.

**Goal:** make abstract concepts concrete and exploratory rather than rote.

**Vision:** a teacher-authorable lab framework and labs for more subjects
(physics simulations, chemistry, biology).

---

### 5.5 Chapter tests & Mock tests

**What:** Two kinds of assessment. A **chapter test** is a node at the end of a
path; a **mock test** is a student-initiated practice exam.

**Technology:** `ChapterTestStartView` pulls from the **QuestionBank** using the
node's `question_filter` (a sanitized JSON filter → ORM query). Mock tests use
`MockTestAttempt` + a generator that mixes QuestionBank questions with the
student's weak-spot concepts.

**Workflow — chapter test:**
1. `POST /api/student/nodes/:id/test/start/` → pulls `test_question_count`
   questions from the QuestionBank matching the chapter filter.
2. The student answers; `.../test/complete/` computes the score and **passes if
   ≥ `test_pass_percentage`** (default 70%). Passing awards 3★ + XP and unlocks
   the next node; failing lets them retry.

**Workflow — mock test:**
1. `POST /api/student/mock-test/generate/` → builds an attempt from QuestionBank
   + the student's weak spots.
2. The student takes it (with a pausable timer); `.../submit/` grades it. Only
   auto-gradable questions count toward the score (no self-marking trust).
3. History is available at `mock-test/history/`.

**Goal:** measure mastery objectively and give exam-style practice targeted at
weaknesses.

**Vision:** full-syllabus mock papers timed and scored like the real board exam.

---

### 5.6 Flashcards, revision nodes & weak-spot personalization

**What:** Concept-review cards shown at smart moments, prioritised by what the
student struggles with.

**Technology:** `Flashcard` + `FlashcardDeck` (purposes: `PREREQUISITE`,
`POST_NODE`, `SIDE_REVISION`), `RevisionNode` (side-content after a node), and
`WeakSpot`-aware sorting in `learning/services.py`.

**Workflow:**
1. **Prerequisite deck** — shown before entering a unit (see Curriculum).
2. **Post-node cards** — after completing a lesson, up to 3 review cards appear.
3. **Revision nodes** — optional side-content branching off the main path;
   `get_personalised_revision_deck` sorts cards so the student's weak concepts
   come first.

**Goal:** reinforce concepts at the moment of greatest impact and personalise
review.

**Vision:** a full spaced-repetition engine scheduling card reviews over time.

---

### 5.7 Gamification (XP, levels, streaks, badges, leaderboard)

**What:** The motivation layer.

**Technology:** `gamification/` app — `StudentXP`, `Streak`, `Badge`,
`StudentBadge`, and `LeaderboardView`. Level formula: `level = min(100, total_xp
// 500 + 1)` (capped at level 100). All XP/streak updates use row locks to be
race-safe.

**Workflow:**
- Completing nodes/labs/tests awards XP (via `award_node_xp`) and advances the
  **streak** (increments on a new consecutive day; resets if a day is missed).
- Badges (e.g. **Scholar** — complete every node in a course) are checked and
  granted automatically on completion.
- **Leaderboard** (`GET /api/gamification/leaderboard/`) ranks students **in the
  same grade** by total XP (top 50, configurable up to 200), flagging the
  viewer's own row.

**Goal:** make daily, consistent practice rewarding and a little competitive.

**Vision:** seasons/leagues, class-vs-class competitions, and teacher-set goals.

---

### 5.8 AI Tutor

**What:** A Socratic chat tutor that guides students to answers rather than
handing them over.

**Technology:** Google **Gemini** (`gemini-2.0-flash`) via `AiTutorView`.
Rate-limited to 30 requests/hour/user. Untrusted chat input is sanitised to
strip prompt-injection attempts before being sent to the model. Chat history is
cached client-side (last ~120 messages); responses render markdown + math.

**Workflow:**
1. Student opens **/tutor**, types a question (or picks a starter prompt).
2. `POST /api/ai/tutor/` builds a Socratic prompt, strips injection patterns,
   and calls Gemini.
3. The response is rendered (markdown + KaTeX) and cached locally. On any upstream
   error the API returns a **generic 503** — error details (which include the API
   key in the URL) are logged server-side only, never leaked to the client.

**Goal:** give every student a patient, always-available tutor that builds
understanding.

**Vision:** make the tutor *context-aware* — aware of the exact node, weak spots,
and the question the student is stuck on; add (deferred) voice and photo input.

---

### 5.9 Study groups (collaborative practice + moderation)

**What:** Real-time-ish study rooms where students practice a question set
together, chat, and raise doubts.

**Technology:** `StudyGroup` (6-char invite code, max 6 members), `GroupSession`
(question or PDF based), `GroupSessionProgress`, `GroupChatMessage`,
`GroupDoubt`, and server-side **chat moderation** (`ChatModerationEvent`).

**Workflow:**
1. A student **creates a group** (gets an invite code) or **joins** via code.
2. The group starts a **session** from AI-generated questions or a teacher paper.
3. Members answer (progress saved per student), **chat** about questions, and
   open **per-question doubts**.
4. **Moderation** runs server-side on every chat message: profanity and
   contact-info are blocked before the message is stored; repeat offences
   escalate mutes (3→5min, 5→15min, 8→24h).
5. A doubt can be **escalated to the AI** (auto-answer) or **to a teacher**.
   Answer keys are revealed only after the session is `completed`.

**Goal:** turn solo practice into social, accountable learning while keeping
chat safe.

**Vision:** live presence, voice rooms, and teacher-hosted sessions.

---

### 5.10 Teacher panel

**What:** The teacher's workspace — build courses, manage questions, generate
exam papers, answer doubts, and (for admins) approve courses.

**Technology:** React `TeacherPanel` with tabs; backends in
`learning/wizard_views.py` (course wizard) and `ai_engine/` (questions, papers,
ingestion). Heavy jobs run on **Celery**.

**Workflows by tab:**
- **Course Builder (wizard):** Identity → Curriculum map (chapters/nodes) →
  Configure → Flashcards → Review → Done. Saves the `CourseUnit` →
  `LearningPath` → `LearningNode` structure. Structure edits are **differential**
  (they don't wipe student progress).
- **Question Editor:** browse/filter the QuestionBank (scoped to the teacher's
  `assigned_subjects`), edit questions and MCQ options. Requires
  `can_edit_questions`.
- **Exam Factory (paper generation):**
  1. Teacher configures a paper (subject, chapters, marks distribution) — AI,
     manual, or hybrid.
  2. `POST /api/ai/generate-paper/` (or `manual-paper/`) kicks off a **Celery
     task**.
  3. The task pulls questions from the QuestionBank, **gap-fills missing ones via
     Groq**, builds **LaTeX**, and compiles a **PDF** with `pdflatex`.
  4. The frontend polls status; on success the teacher downloads the PDF, on
     failure it shows an error (status + message are persisted).
- **PDF Ingestion (Upload):** upload a question PDF → **Groq vision** extracts
  questions → auto-detect subject/chapter/grade → gap-fill → compile into the
  QuestionBank / a paper.
- **Doubt Solver:** view and answer escalated student doubts.
- **Approvals (admin only):** review and approve/reject teacher-submitted
  courses.

**Goal:** let teachers produce interactive courses and exam papers fast, with AI
doing the heavy lifting.

**Vision:** one-click "syllabus → full interactive course," analytics on how a
teacher's students are performing, and collaborative course authoring.

---

### 5.11 Admin panel

**What:** Platform operations.

**Technology:** `users/views.py` (`AdminAnalyticsView`, user management) +
`AdminDashboard` React page.

**Workflow:**
- **Analytics** (`GET /api/auth/admin/analytics/`) — KPIs: user counts by role,
  QuestionBank size, recent papers, and chart data (daily activity, subject
  scores, weak concepts).
- **User management** — paginated user list; toggle `can_build_courses` /
  `can_edit_questions`, activate/deactivate (resets failed-login counter),
  hard-delete non-admins, and assign subjects to teachers.
- **IP bans** — block abusive IPs (`BannedIP` + middleware).

**Goal:** give a small team full operational control and visibility.

**Vision:** richer cohort analytics, content-quality dashboards, and automated
abuse detection.

---

## 6. Security model

| Control | How |
|---------|-----|
| Token storage | httpOnly cookies (not localStorage); `Secure` in prod; `SameSite=Lax`. |
| Token lifetime | access **1h**, refresh **14d**. |
| Brute force | DRF login throttle (10/hour) + per-account lockout after 10 failures (row-locked) + IP-ban middleware. |
| Secrets | `SECRET_KEY` **fails closed** in production if left at the insecure default; secrets come from env, never code. |
| Hosts / CORS | `ALLOWED_HOSTS` fail-closed in prod; CORS open only in DEBUG. |
| Prod hardening | HSTS (1y), SSL redirect, nosniff, `X-Frame-Options: DENY`. |
| Injection | Django ORM (SQL-safe); `question_filter` is sanitised before becoming ORM kwargs; AI prompt-injection patterns stripped. |
| Abuse | server-side chat moderation with escalating mutes. |
| Disclosure | AI errors return generic messages; details (incl. keys) stay in server logs. |
| Logging | structured `envirr.security` logger for failed logins, lockouts, permission grants. |

---

## 7. Quality: CI & automated tests

- **CI — "Auto Sanity Check"** (`.github/workflows/auto-sanity-check.yml`): runs
  **backend tests + frontend build + lint** on every pull request to `main`,
  hourly on a schedule, and on manual dispatch. A failing scheduled run files/
  updates a GitHub issue.
- **Backend tests** (`*/tests.py`): cover the XP/level cap, star thresholds,
  authentication + account lockout, the student-profile signal, and the core
  learning flow (start → grade → unlock). Tests run without external services
  (auth tests use an in-memory cache).

---

## 8. Running the app

```bash
# From the repo root, with Docker running:
docker compose up -d --build      # starts web, frontend, db, redis, celery_worker
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser   # or seed data

# Frontend: http://127.0.0.1:5173   (use 127.0.0.1, not localhost)
# Backend:  http://127.0.0.1:8000/api/
```

- Seed data lives in `learning/management/commands/seed_*.py` (e.g.
  `python manage.py seed_chapter1`).
- Environment variables go in `.env` (gitignored). See
  `.env.production.example` for the production template.

> **Note:** always use `127.0.0.1:5173` rather than `localhost` in development —
> a dead IPv6 forward plus cross-site cookie behaviour can otherwise break login.

---

## 9. Roadmap (long-term vision, consolidated)

1. **Adaptive learning** — order paths and re-tests by weak spots and exam dates;
   full spaced repetition for flashcards.
2. **Context-aware AI tutor** — aware of the current node, the question, and the
   student's history; add voice and photo (vision) input.
3. **Teacher analytics & one-click course creation** — turn a syllabus into a
   complete interactive course; show teachers how their students are doing.
4. **Richer social learning** — live presence, voice study rooms, class leagues.
5. **Broader subjects & labs** — teacher-authorable interactive labs beyond math.
6. **Exam realism** — full timed, board-pattern mock papers with detailed
   analysis.

---

## 10. Where to find things (engineer's map)

| Area | Path |
|------|------|
| Settings, JWT, CORS, Celery, logging | `envirr_backend/settings.py` |
| Users, profiles, auth, lockout, IP bans | `users/` |
| Courses, paths, nodes, progress, study groups, mock tests | `learning/` |
| Learning service logic (XP, unlock, flashcards) | `learning/services.py` |
| Question bank, papers, ingestion, AI tutor, Celery tasks | `ai_engine/` |
| XP, streaks, badges, leaderboard | `gamification/` |
| React pages | `frontend/src/pages/` |
| Reusable components | `frontend/src/components/` |
| Interactive labs | `frontend/src/labs/` |
| Auth state + API client | `frontend/src/context/AuthContext.tsx` |
| Routes | `frontend/src/App.tsx` |
| CI | `.github/workflows/auto-sanity-check.yml` |
