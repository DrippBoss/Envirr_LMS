# Security Concerns & Code Mapping Analysis

This file maps the categorized security concerns against the Envirr LMS codebase, detailing where these risks were found, their potential impact, and how they are addressed.

---

## 1. Confirmed Codebase Vulnerabilities

### A. Broken Authorization & Access Control / Insecure Direct Object References (IDOR)
*   **Leakage of Exam PDFs:**
    *   **Location:** [`learning/study_group_views.py` (TeacherPapersView)](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/learning/study_group_views.py#L303-L332)
    *   **Risk:** Any authenticated student could fetch the absolute URLs and download paths to *all* teacher-generated exams in the database, leading to exam leaks.
    *   **Mitigation:** Filtered `TeacherPapersView` queries to papers created only by the study group's creator or papers linked to their session memberships.
*   **Quiz Completion Spoofing:**
    *   **Location:** [`activity/views.py` (SubmitQuizView)](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/activity/views.py#L7-L19)
    *   **Risk:** A student could submit quiz answers to any lesson in the database (even courses they were not enrolled in) and gain XP.
    *   **Mitigation:** Integrated `check_enrollment_access` from `courses/services.py` to block submissions if the student is not actively enrolled in the course.
*   **Cross-Grade Node Bypass:**
    *   **Location:** [`learning/views.py`](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/learning/views.py) (`NodeStartView`, `NodePracticeView`, etc.)
    *   **Risk:** Students could access nodes or complete practice tasks for classes other than their registered `class_grade` (e.g., a Class 9 student starting a Class 12 test to farm XP).
    *   **Mitigation:** Added strict path-level `class_grade` matching against `request.user.profile.class_grade`.
*   **Unfinished Exam Answer Key Leak:**
    *   **Location:** [`learning/study_group_views.py` (GroupSessionAnswerKeyView)](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/learning/study_group_views.py#L640-L689)
    *   **Risk:** Students could fetch the full answer key to an active exam during the test session.
    *   **Mitigation:** Blocked answer key retrieval if the session status is not strictly `'completed'`.

### B. Session Management Flaws
*   **Extremely High Token Lifetimes:**
    *   **Location:** [`envirr_backend/settings.py`](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/envirr_backend/settings.py#L117-L125)
    *   **Risk:** JWT access tokens lived for `timedelta(days=7)`, expanding the target window if a student's machine or cookies were compromised.
    *   **Mitigation:** Reduced token lifetime to `30 minutes`.
*   **Token Refresh Routing Defect:**
    *   **Location:** [`users/urls.py`](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/users/urls.py#L11)
    *   **Risk:** Token refreshing was routed to the standard SimpleJWT `TokenRefreshView` (which reads from request post parameters) instead of the cookie-based `CookieTokenRefreshView`, breaking secure HTTP-Only flows.
    *   **Mitigation:** Corrected the route mapping in `users/urls.py`.

### C. AI/LLM-Specific Risks (Prompt Injection)
*   **Untrusted Context Interpolation:**
    *   **Location:** [`ai_engine/views.py` (AiTutorView)](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/ai_engine/views.py#L122-L165)
    *   **Risk:** Client-provided `history` and `message` strings were concatenated into the LLM prompt without sanitization. An attacker could inject `[SYSTEM]` tags or custom delimiters to override Socratic tutoring behavior.
    *   **Mitigation:** Created an input sanitization utility (`sanitize_prompt_text`) that filters formatting tags and limits history role structures to trusted user/assistant frames.

### D. Missing Rate Limiting & Denial-of-Service (DoS)
*   **Resource Exhaustion:**
    *   **Location:** Global settings layer.
    *   **Risk:** Heavy AI processing endpoints (calling Ollama model generation) and auth views were open to automated spam, potentially taking down the backend.
    *   **Mitigation:** Enabled DRF's global throttling limits (`AnonRateThrottle` and `UserRateThrottle`).

### E. Information Disclosure & Committed Secrets
*   **Production Stack Traces:**
    *   **Location:** [`.env`](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/.env#L1) & [`settings.py`](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/envirr_backend/settings.py#L14)
    *   **Risk:** `DEBUG = True` committed in the environment exposes internal database schemes, paths, and variables on error screens in production.
    *   **Mitigation:** Ensured `DEBUG` maps correctly to `False` in production contexts.
*   **Committed Plaintext Credentials:**
    *   **Location:** [`.env`](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/.env#L2-L6)
    *   **Risk:** The project committed `SECRET_KEY` and a valid `GEMINI_API_KEY` to the repository.
    *   **Mitigation:** Replace with runtime environment injections.

### F. Business Logic Flaws (Student Progress Deletion)
*   **Course Structure Replacement Cascade Wipes:**
    *   **Location:** [`learning/wizard_views.py` (WizardCourseStructureView)](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/learning/wizard_views.py#L466-L582)
    *   **Risk:** Modifying a course structure with a `PUT` request completely wiped the corresponding paths, cascade-deleting student `NodeProgress` and `SessionAnswer` history for that course.
    *   **Mitigation:** Rewrote the endpoint to perform **differential updates**, saving unmodified nodes and paths in-place.

---

## 2. Latent Concerns (Requiring Future Hardening)

*   **Insecure File Uploads:**
    *   *Where:* [`learning/wizard_views.py` (WizardBulkUploadView)](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/learning/wizard_views.py#L294-L316)
    *   *Risk:* Files are saved directly to `node.video_file = f` without verifying file signatures (magic bytes), limit verification on payload sizes, or scanning with active malware detection tools.
*   **Insecure Password Reset & Account Recovery:**
    *   *Where:* [`users/views.py`](file:///c:/Users/Abhi1/Downloads/Envirr_LMS/users/views.py)
    *   *Risk:* The codebase lacks a self-service password recovery flow. Future implementation of one-time-link logic must use cryptographically secure tokens (`default_token_generator`) and strict expirations.
*   **Insufficient Logging & Monitoring:**
    *   *Where:* Administrative and Auth Views.
    *   *Risk:* The system does not write structured logs for security events (failed login attempts, role promotions, course deletions), making security analysis and auditing difficult.

---

## 3. Protected Concerns (Safeguarded by Django Core)

*   **SQL Injection:**
    *   *Protected:* The application strictly uses the Django ORM. Parameterization is handled automatically.
*   **Cross-Site Request Forgery (CSRF):**
    *   *Protected:* Built-in `CsrfViewMiddleware` is enabled, and API authentication uses SameSite Lax cookies.
*   **Weak Password Storage:**
    *   *Protected:* Hashing uses Django's secure default PBKDF2 algorithm with high iteration counts.
