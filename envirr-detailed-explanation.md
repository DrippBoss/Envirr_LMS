# Envirr v2: Complete Master Architecture & Product Requirements Document

This document captures the **entire essence, flow, and granular functionality** of the Envirr platform. Consider this the Master Blueprint before we scaffold the new Django Database and React frontend. Nothing has been skipped.

---

## 1. The Core Vision
Envirr is a highly structured, scalable, and gamified Learning Management System (LMS) combined with a natively integrated AI engine.
It aims to bridge the gap between Students, Teachers, and Admins by:
1. Enforcing strict, linear learning paths (Duolingo-style interlocking).
2. Maximizing student engagement via gamification (Streaks, XP, Levels).
3. Supercharging Teacher productivity via AI Question Paper Generation and automated Question Banking.
4. Revolutionizing student support via localized, AI-assisted Doubt Resolution.

---

## 2. Platform Roles & Access (Role-Based Access Control)

### The Student (The Learner)
- **Goal**: Learn consistently, maintain streaks, and ask specific doubts without getting stuck.
- **Access**: Can only view content they are enrolled in.
- **Abilities**: Watch videos, read notes, submit quizzes, submit doubt tickets with photos, track XP/streaks, and mark teacher responses as "Resolved" or "Follow-up needed".

### The Teacher (The Creator)
- **Goal**: Author courses, construct quizzes, generate exam papers efficiently, and respond to student queries.
- **Access**: Can manage courses they created and view students enrolled *specifically* in their courses.
- **Abilities**: Build Subject > Course > Unit > Lesson hierarchies. Create Quizzes. Trigger AI to generate Question Papers. Reply to Student Doubt tickets manually.

### The Admin (The Overseer)
- **Goal**: Manage the platform ecosystem and ensure content quality.
- **Access**: 100% Platform Access.
- **Abilities**: Promote/Demote user roles, assign Subjects, audit course contents, and monitor platform-wide analytics.

---

## 3. The Content Hierarchy (The Learning Engine)

The platform is strictly top-down. Teachers build content via this flow:

1. **Subject**: Broad, overarching domain (e.g., *Mathematics*, *Science*). Managed by Admins to prevent duplicates.
2. **Course**: Specific grade/syllabus targeting (e.g., *10th Grade CBSE Math*). Authored by Teachers.
3. **Unit**: A logical grouping of lessons (e.g., *Algebra*). 
   - **Crucial Mechanic: Unit Interlocking (Prerequisites)**: Units can have prerequisites. A student *cannot* access "Unit 2: Geometry" until they achieve a 100% completion state in "Unit 1: Algebra".
4. **Lesson**: The base node. Contains:
   - Secure Video player stream.
   - Downloadable PDF notes.
5. **Quiz Checkpoint**: Every lesson is "gated" by a Quiz.
   - **Crucial Mechanic: Quiz Gating**: A student *must* pass the quiz (hitting the defined passing percentage) to mark the Lesson as "Completed". Only when all lessons in a unit are completed does the unit unlock the *next* unit.

---

## 4. The Gamification Engine (The Engagement Engine)

To prevent learner churn, the platform utilizes proven psychological loops:

1. **Daily Streaks**:
   - If a student logs an activity (submitting a quiz, answering a practice question), their streak increments.
   - **Strict Anchoring**: Streaks reset exactly at Midnight localized time. If a student misses a 24-hour calendar day, their streak breaks back to 0. (Future provision: Streak "freezes" bought via XP).
2. **XP (Experience Points) & Levels**:
   - Passing quizzes, resolving doubts, and hitting streak milestones award XP (e.g., +50 XP for passing a quiz).
   - Once total XP crosses a threshold, the student's Level increments (e.g., Level 1 -> Level 2).
3. **Badges/Achievements**:
   - Time-based (e.g., *7-Day Streak* icon).
   - Effort-based (e.g., *First Perfect Quiz Score*).

---

## 5. The AI Assessment & Question Bank Ecosystem (The Teacher API)

This is the platform's "Superpower" feature. Teachers can instantly generate complete formatting-ready question papers. This happens in a highly orchestrated sequence:

### The Database Question Bank
- Envirr features a massive, permanent internal database of Questions defined by: Subject, Chapter, Concept, Type (MCQ/Cases/Short), and Marks.

### AI Intelligent Paper Generation (The Flow)
When a teacher clicks "Generate 80-Mark Midterm for Chapter 1, 2, and 3":
1. **Normalization**: The AI standardizes the Teacher's input (converting slang chapter names to official CBSE registry strings).
2. **Bank Search**: The system searches our DB to find existing matching questions that total 80 marks adhering to the strict CBSE structural blueprint (e.g., exactly 16 MCQs, 3 Case Studies, etc.).
3. **AI Gap Filling (Triple Loop)**: If the DB is missing questions (e.g., it only found 10 MCQs and needs 6 more), the Backend silently triggers the LLM (Gemini/DeepSeek) using *Structured JSON Schema Outputs* to hallucinate mathematically perfect, non-repeating questions representing the missing gaps *spread evenly across all requested chapters*. 
4. **Bank Seeding**: Newly generated AI questions are stored perpetually in the DB for future uses.
5. **Typesetting & Compilation**: The backend dynamically writes a `.tex` payload encompassing the questions and invokes the host server's LaTeX compiler to produce a beautiful, downloadable PDF.

---

## 6. The Contextual Doubt Engine (Support System)

Unlike generic forums, Envirr tightly links doubts to context.

1. **Student Submission**: A student struggling on a Quiz question opens an "Ask Doubt" ticket. They can upload an image of their scratchpad/handwriting via a rich text editor.
2. **AI Pre-Processing**: Before a human teacher wastes time, the LLM intercepts the doubt, parses the image context, and attempts to offer a hint or full pedagogical explanation.
3. **Teacher Fallback**: If the AI is unconfident, or the student requests human help, the ticket is routed to the Teacher.
4. **Closing the Loop**: A Teacher replying to a doubt *does not* resolve it. The **Student** must click either "Resolved" (I understand now) or "Need More Help". This forces genuine pedagogy.

---

## 7. Performance, Async Architecture, and Security

Moving to Django inherently solves massive structural flaws from the old stack, but we must also introduce true asynchronous processing to prevent server hangs:

- **Celery & Redis Worker Queues (Crucial for AI)**: Paper Generation (LaTeX compiling), Image Parsing (OCR/Doubts), and mass-LLM generation **cannot** be synchronous. Asking the server to wait while an LLM hallucinates 10 questions will freeze Gunicorn/Waitress completely under load. These tasks are strictly offloaded to Celery Background Workers tracking status via WebSocket payloads or frontend polling.
- **Redis Caching Layer (Cost Protection)**: Hitting the LLM for repeated topics causes rapid API cost explosions. Any AI Output (Normalized Prompts, frequently queried Paper structures, AI Doubt responses for common questions) is securely cached in Redis with strict TTLs (Time-to-Live). 
- **Authorization/IDOR Protection**: Django inherently uses Object-Level Permissions. A public user cannot guess a quiz ID and view it. An endpoint fetching a "Quiz" inherently filters by `Enrollment.objects.filter(student=user, course=quiz.course)`.
- **Media Segregation**: Uploaded Doubt images and Generated PDFs aren't thrown loosely onto the OS hard drive. They are streamed via Django standard FileBackends (or AWS S3) and heavily validated against infinite DoS disk hoarding, routinely deleting orphaned temporary LaTeX compilation `.aux`/`.tex` files safely.
- **Transactional Consistency**: If a student is awarded 50 XP, increments the streak, and passes a quiz, Django executes this in an `atomic()` database block. If the server crashes mid-process, it rolls back perfectly, avoiding a corrupted state.

---

## 8. Database Architecture (The 5 Django Apps)

To make the database highly scalable and avoid massive bottleneck queries, the database is split into **5 distinct Django Apps (Domains)**:

### 8.1 `users` Architecture (Role-Based Access)
Handles Authentication and strict roles.
- **CustomUser**: Replaces default Django User. Has fields for `email`, `password`, `name`, and an Enum `role` (Admin, Teacher, Student). Everything cascades from here.

### 8.2 `courses` Architecture (Content Hierarchy)
Enforces the mandatory prerequisite locking mechanism.
- **Subject**: E.g., Mathematics.
- **Course**: Points to Subject (Foreign Key) + Creator (Foreign Key).
- **Unit**: Points to Course. Has a `sequence_order` integer.
- **UnitPrerequisite**: A mapping table where `Unit_A` requires `Unit_B`.
- **Lesson**: Points to Unit. Contains `video_url` and `notes_url`.
- **Quiz**: Replaces the end of a lesson. Contains `passing_percentage`.
- **QuizQuestion**: MCQ options and correct answer mapping.

### 8.3 `activity` Architecture (Enrollments & Tracking)
Tracks movement to keep the LMS state reliable.
- **StudentEnrollment**: Maps User IDs to Course IDs.
- **UnitCompletion**: Logs timestamp when a unit's prerequisite quizzes are fully passed.
- **QuizSubmission**: The transaction. Logs `score` and a boolean `passed` flag.

### 8.4 `gamification` Architecture (XP & Streaks)
Separated logically to prevent heavy traffic collisions with course reads.
- **Streak**: Maps to User. *Crucial optimization:* Uses native `date` for `last_activity_date` to anchor streaks to Midnight, preventing the sliding 24-hr bug.
- **StudentXP**: The global ledger of their points and level mapping.

### 8.5 `ai_engine` Architecture (Superpowers)
Handles the heavy NLP generation strings safely.
- **QuestionBank**: Centralized pool mapping `chapter`, `type`, `marks`, and a boolean `is_ai_generated`.
- **GeneratedPaper**: Holds the `secure_pdf_path`.
- **PaperQuestion (Many-to-Many)**: A bridge table mapping `GeneratedPaper` <> `QuestionBank`. This allows SQL to efficiently check which questions have been used recently to guarantee the "70% freshness" rule without massive loops!
- **DoubtTicket & DoubtResponse**: Links student tickets to the exact Lesson ID, and tracks `is_ai_generated` for responses.

---

## 9. The AI Tutor Brain (Analytics & Personalization)

By harvesting the raw data of every quiz submission and doubt ticket, we build an intelligent Analytics Layer ensuring the platform is proactive, not just reactive:
- **Weak Concept Tracking**: Instead of just logging "Passed/Failed", the Database captures exactly which *Concepts* the student struggled with.
- **Proactive Interventions**: If a student fails 3 Algebra MCQs specifically on "Quadratic Equations", the AI Tutor Brain intercepts and recommends: *"You’re weak in Quadratic Equations → revise this specific lesson"*.

---

## Conclusion
This constitutes every moving part of the Envirr vision. The web app is not just a collection of APIs, but a deeply interconnected, asynchronous state machine enforcing learning prerequisites, preventing API cost bloat via Redis, scaling via Celery workers, and fueling engagement simultaneously with AI.
