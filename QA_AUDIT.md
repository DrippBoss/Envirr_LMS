# Envirr LMS — QA Audit & Open Issues
> Full audit performed: 2026-06-07
> See also: KNOWLEDGE_BASE.md

---

## BROKEN / HIGH-PRIORITY BUGS

### B1: Celery Task Failures Are Silent
**Where**: `ai_engine/tasks.py` — `generate_paper_task`, `compile_manual_paper_task`
**Issue**: No try/catch around `pdflatex` subprocess or Groq API calls. If either fails, the Celery task throws an unhandled exception, `QuestionPaper.secure_pdf_path` is never set, and the user sees the status spinner indefinitely. No error status is written back to the paper record.
**Impact**: Paper generation is effectively broken if Groq is down or pdflatex is not installed.
**Fix needed**: Wrap in try/except, update paper status to "failed" with error message.
**Status**: OPEN

### B2: NodeProgress Status Enum Mismatch
**Where**: `learning/views.py` — `UnitPrerequisitesView` (POST handler, ~line 77)
**Issue**: Code sets `status='UNLOCKED'` as a plain string instead of using the CompletionStatus enum constant. This may silently fail or save incorrectly depending on field type.
**Status**: OPEN

### B3: Mock Test Self-Marking Has No Backend Validation
**Where**: `frontend/src/pages/MockTestPage.tsx` lines 393-401
**Issue**: For LONG/SHORT answer questions, the user marks their own answer correct or wrong. There is no backend validation — the self-assessment is sent directly to the submit endpoint. Students can mark all long-form answers correct to inflate scores.
**Status**: OPEN

### B4: Admin Dashboard KPI Cards Show Hardcoded Mock Data
**Where**: `frontend/src/pages/AdminDashboard.tsx` lines 6-21
**Issue**: `DAY_BARS`, `SUBJECT_SCORES`, `WEAK_CONCEPTS` arrays are statically defined and never updated from the API response even though the API returns real data. The charts always show the same fake values.
**Status**: OPEN

### B5: Video Completion Not Enforced Before Practice
**Where**: `frontend/src/pages/NodePage.tsx` ~line 275-294
**Issue**: If `video_url` is empty, a placeholder is shown but the user can still click to proceed to practice questions. The backend `NodeVideoCompleteView` is never called, so the node advances to PRACTICE step without the video being recorded as watched.
**Status**: OPEN

### B6: OAuth / Google / SSO Buttons Are Non-Functional Placeholders
**Where**: `frontend/src/pages/Login.tsx`
**Issue**: "Continue with Google" and "SSO" buttons exist in the UI but have no `onClick` handlers. Clicking them does nothing.
**Status**: OPEN (feature not built)

### B7: Forgot Password Flow Not Wired
**Where**: `frontend/src/pages/Login.tsx` ~line 370
**Issue**: "Forgot Password?" button exists but is not connected to any handler or route. No password reset endpoint exists in the backend either.
**Status**: OPEN (feature not built)

### B8: Voice Input & Photo Upload in AI Tutor Are Non-Functional
**Where**: `frontend/src/pages/AiTutor.tsx` lines 310-316
**Issue**: Voice ask and photo upload buttons exist but have no `onClick` handlers.
**Status**: OPEN (feature not built)

### B9: "Show More Users" in Admin Dashboard Is Non-Functional
**Where**: `frontend/src/pages/AdminDashboard.tsx` ~line 882
**Issue**: Button exists but is not wired to any pagination logic.
**Status**: OPEN

### B10: StudyGroup MAX_MEMBERS Inconsistency
**Where**: `learning/models.py` — StudyGroup model
**Issue**: `max_members` default is 10, but `MAX_MEMBERS` class constant is 6. The frontend uses `Math.min(..., StudyGroup.MAX_MEMBERS)` which conflicts with the model default. Groups could be created with up to 10 members via the API.
**Status**: OPEN

---

## SECURITY CONCERNS

### S1: Race Condition on Failed Login Attempts
**Where**: `users/views.py` — `CookieTokenObtainPairView`
**Issue**: `failed_login_attempts` is incremented without `select_for_update()`. Concurrent simultaneous login attempts from different sessions could bypass the 10-attempt lockout.
**Status**: OPEN

### S2: Hardcoded Localhost URLs (Not Production-Ready)
**Where**: Multiple files
- `ai_engine/views.py`: `http://host.docker.internal:11434/api/generate` (Ollama)
- `settings.py`: `redis://localhost:6379/1` (Celery broker — should be `REDIS_URL` env var)
- `settings.py`: `FRONTEND_URL = 'http://localhost:5173'`
- `settings.py`: `ALLOWED_HOSTS = ['*']`
**Status**: OPEN

### S3: question_filter JSONField ORM Injection Risk
**Where**: `learning/views.py` — `ChapterTestStartView`
**Issue**: `LearningNode.question_filter` (JSONField) is unpacked directly as `QuestionBank.objects.filter(**question_filter)`. A malformed or adversarially crafted JSON could probe internal data. No whitelist validation of allowed filter keys.
**Status**: OPEN

### S4: DoubtTicket References Legacy `courses.Lesson` Not `learning.LessonQuestion`
**Where**: `ai_engine/models.py` — `DoubtTicket.lesson`
**Issue**: FK points to `courses.Lesson` (the old Course app), not `learning.LessonQuestion` (the active learning flow). Doubt tickets cannot be linked to actual lessons in use.
**Status**: OPEN

### S5: TeacherPapersView Returns All Papers (Missing Ownership Filter)
**Where**: `learning/study_group_views.py` — `TeacherPapersView`
**Issue**: Marked with `IsStudent` permission but returns ALL QuestionPapers, not scoped to the current teacher or student's grade. Students could see papers they shouldn't.
**Status**: OPEN

---

## DATA INTEGRITY ISSUES

### D1: WeakSpot Never Cleared on Correct Answer
**Where**: `learning/models.py` — `SessionAnswer.save()`
**Issue**: `WeakSpot` records are only created/incremented on wrong answers; they are never decremented or cleared when the same concept is answered correctly in future sessions. WeakSpots accumulate indefinitely.
**Status**: OPEN

### D2: QuestionBank Hash Collision Not Handled
**Where**: `ai_engine/models.py` — `QuestionBank.save()`
**Issue**: `question_hash` is SHA256 of (subject + chapter + question_text) only — `question_type` is NOT included. Same question text in different types generates the same hash. The `except Exception: pass` on hash collision silently drops the question.
**Status**: OPEN

### D3: XP Level Has No Upper Bound
**Where**: `learning/services.py` — `award_node_xp()`
**Issue**: `current_level = max(1, total_xp // 500 + 1)` — there is no cap. With enough XP, students reach level 10000+.
**Status**: OPEN

### D4: GroupSessionProgress Created Without get_or_create
**Where**: `learning/study_group_views.py` — `GroupSessionCreateView`
**Issue**: Progress records created without `get_or_create`. Network retries create duplicate (session, student) entries.
**Status**: OPEN

### D5: Cascading Delete Risk
**Where**: Django ORM — `CourseUnit` delete
**Issue**: `CourseUnit.delete()` cascades to `LearningPath → LearningNode → SessionAnswer`, deleting all student progress for that unit silently. No soft-delete protection.
**Status**: OPEN

### D6: WeakSpot Transaction Without on_commit
**Where**: `learning/models.py` — `SessionAnswer.save()`
**Issue**: `WeakSpot` created inside a request transaction without `transaction.on_commit()` guard. If the outer transaction rolls back, orphaned WeakSpot records remain.
**Status**: OPEN

---

## FRONTEND HARDCODING (Should Be API-Driven)

| Hardcoded Value | Location | Should Come From |
|----------------|----------|-----------------|
| 500 XP per level | StudentDashboard:132 | API `/gamification/stats/` or config |
| 3 initial lives | NodePage:25 | API `node/start/` response |
| Class grades [9,10,11,12] | Login:320 | API `/grades/` metadata endpoint |
| Board options [CBSE, ICSE...] | Login:333 | API metadata endpoint |
| Subject colors & icons | StudentDashboard:27-32 | API subject metadata |
| 120 message AI tutor cache limit | AiTutor:37 | Config constant |
| Auto-graded question types list | MockTestPage:50 | API metadata endpoint |
| Paper section templates (A/B/C/D) | UploadIngest:144 | User-configurable or API defaults |
| Lab node hex colors (#6366f1) | NodeCard:33-44 | Design system tokens or API |
| DAY_BARS / SUBJECT_SCORES (admin) | AdminDashboard:6-21 | Replace with live API data |

---

## PERFORMANCE CONCERNS

### P1: No Pagination on High-Traffic Views
**Where**: `DashboardView`, `QuestionBankListView`, `LeaderboardView`
**Issue**: Returns all results without pagination. Will degrade with large datasets.
**Status**: OPEN

### P2: N+1 Queries in Serializers
**Where**: `learning/serializers.py` — LearningPathSerializer
**Issue**: Iterates nodes without confirmed `select_related`/`prefetch_related`.
**Status**: OPEN — needs profiling

### P3: No Caching on Frequently-Read Data
**Where**: `DashboardView`, `QuestionBankMetaView`
**Issue**: Fresh DB query on every dashboard load. No Redis caching despite Redis being available.
**Status**: OPEN

### P4: Image URL Object Leak in QuestionEditor
**Where**: `frontend/src/components/QuestionEditor.tsx` ~line 109
**Issue**: `URL.createObjectURL()` called but `URL.revokeObjectURL()` never called. Memory leak.
**Status**: OPEN

---

## MISSING FEATURES (UI Exists, Backend Absent)

| Feature | Status |
|---------|--------|
| Password reset flow | Backend endpoint missing; UI button dead |
| Google OAuth / SSO login | Placeholder buttons; not wired |
| Voice input in AI Tutor | Button exists; no handler |
| Photo upload in AI Tutor | Button exists; no handler |
| "Browse All" study groups link | Link exists; not wired |
| Discussion forums (in NavItems) | Not implemented |
| Resource downloads (in NodePage) | ResourceBrowser not wired |
| Notifications system | No bell icon or real-time alert |
| Student analytics/progress report | No dedicated page |
| User settings/preferences page | Theme toggle is the only setting |

---

## UX ISSUES

### U1: Login Email Verification Requires Full Re-Login for Resend
**Where**: `Login.tsx` ~line 78-83
**Issue**: `handleResendVerification()` performs a temporary login to call `send-verification/`. Should use a token-based resend endpoint that doesn't require full credentials.

### U2: Revision Node Insertion Logic Is Fragile
**Where**: `LearningMap.tsx` ~line 223
**Issue**: Frontend inserts revision nodes at `midPoint - 1`. If path has < 2 nodes, breaks rendering. Backend should control ordering.

### U3: Missing Markdown in AI Tutor Responses
**Where**: `AiTutor.tsx`
**Issue**: AI responses are plain text. Code blocks, LaTeX, lists, tables are not rendered.

### U4: Mock Test Timer Has No Pause Feature
**Where**: `MockTestPage.tsx` ~line 218
**Issue**: Timer starts immediately with no pause/resume.

### U5: REARRANGE Answer Format Inconsistency (Likely Active Bug)
**Where**: `QuestionCard.tsx` ~line 40; `NodePracticeAnswerView` backend
**Issue**: Frontend may send rearranged chip indices while backend expects raw chip text. All REARRANGE answers may be marked wrong silently. **Needs manual test to confirm.**

---

## OPEN QUESTIONS FOR DEVELOPER

### OQ1: Legacy `courses` App Status
Is the `courses` app (referenced by `activity` models and `DoubtTicket.lesson`) still in use, deprecated, or being migrated to `learning` app models?

### OQ2: Two Parallel Question Flow Paths
`ChapterTestStartView` pulls directly from `QuestionBank`. `GeneratePaperAPIView` runs a full Celery + LaTeX pipeline. Are these intentionally separate workflows (quick in-app test vs printed paper) or should they converge?

### OQ3: Lab Node Content Storage
`LearningNode.node_type = LAB` exists in models and views (`LabCompleteView`), and frontend has `LabDispatcher`. But there are no Lab content models. Where is the lab template/content stored? Is `lab_artifact` the student's submission or the template?

### OQ4: `concerns.md` File Contents
There is a `concerns.md` in the project root (not committed). What does it contain? It may have important context about known issues.

### OQ5: `fix_ap_latex.py` Script
Standalone script in root. Is it a one-time migration script or still in active use?

### OQ6: StudyGroup Chat Moderation Enforcement
Is profanity/contact-info blocking enforced server-side before messages are saved to `GroupChatMessage`, or is it client-side only? If client-side, the backend endpoint can still receive raw unmoderated content via API.

### OQ7: REARRANGE Answer Format Contract
What format does `NodePracticeAnswerView` expect for REARRANGE answers — the raw chip text strings, or array indices? The frontend `QuestionCard.tsx` behavior may not match. This could be causing all REARRANGE questions to be marked wrong silently.

### OQ8: Ollama vs Groq Strategy
AI Tutor uses Ollama/LLaMA 3 locally. Paper generation/ingestion uses Groq. Is this intentional (local for privacy, cloud for throughput)? Is there a plan to consolidate?

### OQ9: Email in Production
`EMAIL_BACKEND` falls back to console if SMTP not configured. Has SMTP been tested end-to-end in production? Are verification emails actually delivered?

### OQ10: `frontend/src/labs/` Directory
What is in `frontend/src/labs/`? These appear to be interactive lab components referenced by `LabDispatcher` but were not audited.

---

## RESOLVED

### R1: Login Error Message (2026-04-12)
**Issue**: Login showed "An error occurred" because handler looked for `data.error` but DRF returns `data.detail` or `data.non_field_errors`.
**Fix**: Updated `Login.tsx` error catch to check `data.detail`, `data.non_field_errors`, then `data.error`.
**Status**: RESOLVED ✓

### R2: JWT in localStorage → httpOnly Cookies
**Issue**: Prior version stored access tokens in localStorage (XSS risk).
**Fix**: Migrated to httpOnly cookie-based JWT storage.
**Status**: RESOLVED ✓
