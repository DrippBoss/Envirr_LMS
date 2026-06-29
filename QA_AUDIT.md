# Envirr LMS — QA Audit & Open Issues
> Original full audit: 2026-06-07.
> **Reconciled against the codebase 2026-06-29 — every item below is now RESOLVED.**
> Remediation landed across PRs #43–#124. See also: KNOWLEDGE_BASE.md, DOCUMENTATION.md.

---

## STATUS SUMMARY (2026-06-29)

All originally-logged issues are fixed. Full page audit complete (13 frontend
pages — no dead/broken interactive elements remain).

**2026-06-29 feature audit** (full live API smoke across admin/teacher/student +
write flows + Django suite + frontend build): every feature working or behaving
as intended. `manage.py check` clean · **62 backend tests pass** · frontend
builds · 27 read endpoints healthy (the only non-200 is the teacher-dashboard
`403`, which is the **intended** course-builder analytics gate — verified to
open to `200` for a `can_build_courses` teacher) · create-doubt / mock-test /
assignment / question write flows all succeed. One red item: the **AI Tutor
returns 503 when Gemini replies 429 (free-tier quota exhausted)** — an external
API-quota/ops issue, not a code defect; the app degrades gracefully. See
OUTSTANDING #6.

**E2E coverage now exists** — Playwright suite added (PR #124): `frontend/tests/`,
6 specs / 20 tests, run via `npm test` (in `frontend/`) or the `/intent-test`
skill. The remaining outstanding items are content/ops tasks under
**OUTSTANDING** — none are open bugs.

---

## BROKEN / HIGH-PRIORITY BUGS — ALL RESOLVED ✓

- **B1 Celery task failures silent** — ✅ paper tasks wrap body in try/except; persist `status='failed'` + `error_message`; frontend shows an error screen.
- **B2 NodeProgress status enum mismatch** — ✅ replaced bare string literals with `CompletionStatus.*` / `NodeStep.*` / `NodeType.*` (PR #61).
- **B3 Mock-test self-marking unvalidated** — ✅ `_grade()` returns `is_correct=None` for self-marked types; the official score counts only `is_correct is True`, so self-marks cannot inflate it (`learning/mock_test_views.py`).
- **B4 Admin KPI cards hardcoded** — ✅ charts are API-driven from `GET /auth/admin/analytics/`.
- **B5 Video completion not enforced** — ✅ `NodePracticeView` 403s unless step ∈ {PRACTICE, COMPLETED}; `NodeStartView` auto-advances only when there is no video.
- **B6 OAuth/SSO dead buttons** — ✅ removed (PR #48/#49); verified no remnants remain in `Login.tsx`.
- **B7 Forgot-password not wired** — ✅ `POST /auth/password-reset/` (+ confirm, 2h token) + frontend modal/route (PR #48/#49).
- **B8 Voice/photo in AI Tutor** — ✅ feature DEFERRED (issue #8); the non-functional buttons were removed so the UI isn't misleading (PR #95). Re-add when the feature is built.
- **B9 "Show More Users" dead** — ✅ paginated `AdminUsersListView` + wired button (PR #50/#51).
- **B10 StudyGroup MAX_MEMBERS inconsistency** — ✅ field default == `MAX_MEMBERS` (6) via migration 0016.

---

## SECURITY CONCERNS — ALL RESOLVED ✓

- **S1 Race on failed-login counter** — ✅ `select_for_update()` row lock before increment.
- **S2 Hardcoded localhost URLs** — ✅ env-driven (`ALLOWED_HOSTS` fail-closed, `REDIS_URL`/`CACHE_URL`, `FRONTEND_URL`). Ollama removed entirely (PR #73).
- **S3 question_filter ORM injection** — ✅ `_sanitize_question_filter()` whitelists fields/lookups before unpacking into ORM kwargs.
- **S4 DoubtTicket legacy FK** — ✅ retargeted to `learning.LearningNode` (migration 0007); the model is now fully wired to a doubt API (PR #92/#93).
- **S5 TeacherPapersView returns all papers** — ✅ scoped to the student's grade.

> Note (not in original audit): committed secrets — `mcp-config.json` currently
> holds live API keys in the working tree (uncommitted). See OUTSTANDING.

---

## DATA INTEGRITY — ALL RESOLVED ✓

- **D1 WeakSpot not cleared on correct** — ✅ decremented/resolved on correct answer (`on_commit`).
- **D2 QuestionBank hash collision** — ✅ `compute_hash()` includes `question_type`.
- **D3 XP level unbounded** — ✅ `level_for_xp()` capped at `MAX_LEVEL` (100); covered by tests.
- **D4 GroupSessionProgress duplicates** — ✅ all creation sites use `get_or_create`.
- **D5 Cascading delete wipes progress** — ✅ `LearningPath.unit` is `SET_NULL`.
- **D6 WeakSpot without on_commit** — ✅ wrapped in `transaction.on_commit`.

---

## FRONTEND HARDCODING — ALL RESOLVED ✓
`GET /api/metadata/` is the single source of truth for grades, boards, XP/level
config, initial lives, subjects, auto-graded types, tutor history limit, paper
section defaults. Lab hex colors are intentional design tokens. The last stray
value — the teacher panel's fake "Questions Available: 1,248" KPI — was replaced
with a real metric (PR #96).

---

## PERFORMANCE — ALL RESOLVED ✓
P1 pagination, P2 N+1 (prefetched context maps), P3 Redis caching, P4
`URL.revokeObjectURL()` — all addressed (PR #44/#45).

---

## MISSING FEATURES — RESOLVED ✓ (or deferred)
Password reset ✓ · OAuth removed ✓ · "Browse All" study groups ✓ · dead
forums/resources/notifications removed ✓ · student analytics page ✓ (500 also
fixed, PR #86) · settings/profile ✓ · **Doubt solver built end-to-end** (student
asks on a lesson → teacher answers, PR #92/#93). Voice/photo tutor input remains
DEFERRED (issue #8).

---

## UX ISSUES — ALL RESOLVED ✓
U1 token-based resend · U2 backend-controlled revision ordering · U3 AI-tutor
markdown/KaTeX · U4 mock-test timer pause · U5 REARRANGE format.

---

## OPEN QUESTIONS — ALL ANSWERED ✓
- **OQ1** legacy `courses`/`activity` apps — deregistered (PR #67).
- **OQ2** two question-flow paths — intentionally separate (in-app test vs printed paper); documented (PR #74).
- **OQ3 / OQ10** lab content & `frontend/src/labs/` — audited: labs are client-side React components keyed by `lab_type` (no server template); `lab_artifact` = student submission; `LabCompleteView` awards 3★+XP. Healthy.
- **OQ4** `concerns.md` — reviewed; surfaced gaps fixed (PR #68).
- **OQ5** `fix_ap_latex.py` — one-time utility script; safe to keep/delete.
- **OQ6** chat moderation — enforced server-side before persisting `GroupChatMessage`.
- **OQ7** REARRANGE format — verified; whitespace/connector-insensitive matching with commutative fallback.
- **OQ8** Ollama vs Groq — consolidated: **Gemini** for the tutor, **Groq** for paper gen/ingestion; Ollama removed (PR #73).
- **OQ9** email in production — hardened (gunicorn, STATIC_ROOT, FRONTEND_URL, security headers; PR #66).

---

## OUTSTANDING (content/ops — not open bugs)

1. **🔐 `mcp-config.json` API keys** — live Gemini/NVIDIA/Groq keys are pasted into the `apiKeyEnv` fields in the working tree (the file is unused/orphaned). Restore env-var names or delete, and **rotate the keys**. The only item with a real security dimension.
2. **📝 Chapter-test content gap** — "Chapter 10: Circles" and the Grade-9 units have no scoped test filter because `QuestionBank` has no grade field and lacks matching questions. Needs grade-9 / Circles questions authored (and ideally a `class_grade` field on QuestionBank). Migration 0017 scoped all G10 tests with a real pool.
3. **⚠️ Seeder re-break** — ✅ FIXED (PR #98): the G10 seed commands now set the chapter `question_filter` on their test node. (G9/no-pool seeders intentionally left — no question pool to scope to.)
4. **🎨 Flashcard Phase 3** — the model + UI now support markdown/KaTeX, formula/example blocks, and an image field, but seeded cards are still plain title+body. Populate richer content/diagrams. *(Content task — requires authoring, not code.)*
5. **🧪 Test coverage** — **62 backend tests** (up from 32): auth, gamification, core learning flow, analytics endpoint, doubt feature, chat moderation, plus bulk-ingest helpers/guards and question-import. **E2E suite added (PR #124)**: Playwright, 6 specs / 20 tests covering login, student dashboard/mock-test/AI-tutor, admin dashboard, and a `qa-audit` bug-regression spec (B4/B6/B7/B8/B9, U3/U4). Run with `cd frontend && npm test` (needs the app running + `frontend/.env.test` creds; roles without creds skip) or the `/intent-test` skill. Still thin on the server side: mock-test grading internals, paper generation/ingestion (need Groq/LaTeX mocks), the course wizard.
6. **🤖 AI Tutor / lesson-planner — Gemini quota** — the tutor returns `503` whenever Gemini replies `429 Too Many Requests` (free-tier daily quota exhausted). Not a code bug (handled gracefully), but the feature is dark until the `GEMINI_API_KEY` quota resets or is upgraded/rotated. Same ops class as the expired `GROQ_API_KEY` that blocks bulk vision ingestion. ⚠️ The key value currently appears in the server-log traceback on failure — scrub before any shared/centralised logging.

---

## RESOLVED HISTORY (selected)
- 2026-04-12 R1 login error message; (earlier) R2 JWT → httpOnly cookies.
- 2026-06-07 → 06-13: data-integrity, performance, config-hardening, auth-recovery, enum, FK, dead-UI, student-analytics batches (PRs #43–#67).
- 2026-06-28 session (PRs #69–#96): green build + real CI + 23 backend tests; AI provider consolidation (Gemini tutor, Ollama removed); route code-splitting; G10 chapter-test scoping; flashcard markdown/KaTeX + images; Curriculum page + sidebar-nav fixes; Review-Foundations fix; My-Progress 500 fix; mock-test hardening; study-group polish; **doubt feature built**; full 13-page audit (dead Analytics tab, admin search, tutor voice/photo, fake KPI all removed/fixed).
- 2026-06-29 session (PRs #106–#124): micro-interactions (toast/Tooltip/ProgressBar/EmptyState); teacher AI workspace (dashboard analytics, lesson planner, assignments, calendar, sections/roster); student-analytics course-builder gate (#112); admin enterprise dashboard + reusable chart library (#113); Course Builder UX overhaul (#114–#116); bulk question ingestion + import commands (#117–#123); login throttle fix (#120); staging-deploy config; **full feature audit (all green)**; **Playwright E2E suite scaffolded (#124)** — closes the `/intent-test` gap.
