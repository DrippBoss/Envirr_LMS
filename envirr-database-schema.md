# Envirr v2: Database Schema & Entity-Relationship (ER) Diagram

To perfectly capture the flow of data mapping to our Django backend, the schema is organized into 5 logical Domains (Django Apps). This ensures our code remains modular and extremely scalable.

## Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    %% USERS DOMAIN
    USER {
        int id PK
        string email
        string password
        string name
        enum role "admin, teacher, student"
    }

    %% COURSES DOMAIN
    SUBJECT {
        int id PK
        int created_by_id FK
        string name
        string description
    }
    COURSE {
        int id PK
        int subject_id FK
        int created_by_id FK
        string name
        enum status "draft, published"
    }
    UNIT {
        int id PK
        int course_id FK
        string name
        int sequence_order
    }
    UNIT_PREREQUISITE {
        int id PK
        int unit_id FK
        int required_unit_id FK
    }
    LESSON {
        int id PK
        int unit_id FK
        string title
        string video_url
        string notes_url
        int sequence_order
    }
    QUIZ {
        int id PK
        int lesson_id FK
        string title
        int passing_percentage
    }
    QUIZ_QUESTION {
        int id PK
        int quiz_id FK
        enum type
        string text
        string options_json
        string correct_answer
    }

    %% ENROLLMENTS & COMPLETIONS DOMAIN
    STUDENT_ENROLLMENT {
        int id PK
        int student_id FK
        int course_id FK
        datetime enrolled_at
    }
    UNIT_COMPLETION {
        int id PK
        int student_id FK
        int unit_id FK
        datetime completed_at
    }
    QUIZ_SUBMISSION {
        int id PK
        int student_id FK
        int quiz_id FK
        int score
        boolean passed
    }

    %% GAMIFICATION DOMAIN
    STREAK {
        int id PK
        int student_id FK
        int current_streak
        int longest_streak
        date last_activity_date
    }
    STUDENT_XP {
        int id PK
        int student_id FK
        int total_xp
        int current_level
    }

    %% ANALYTICS & TUTOR DOMAIN
    STUDENT_PERFORMANCE {
        int id PK
        int student_id FK
        float overall_accuracy
        datetime last_assessed
    }
    WEAK_CONCEPT_TRACKING {
        int id PK
        int student_id FK
        string concept_name
        int failure_count
        boolean needs_intervention
    }

    %% AI ENGINE & PAPER DOMAIN
    QUESTION_BANK {
        int id PK
        string subject
        string chapter
        string concept
        enum type
        int marks
        enum difficulty
        string question_text
        string answer_text
        boolean is_ai_generated
    }
    GENERATED_PAPER {
        int id PK
        int created_by_id FK
        string title
        json config
        string secure_pdf_path
        string share_link
    }
    PAPER_QUESTION {
        int id PK
        int paper_id FK
        int question_id FK
    }
    DOUBT_TICKET {
        int id PK
        int student_id FK
        int lesson_id FK
        string question_text
        string image_url
        enum status "open, answered, resolved"
    }
    DOUBT_RESPONSE {
        int id PK
        int doubt_id FK
        int responder_id FK
        string text
        boolean is_ai_generated
    }

    %% RELATIONSHIPS
    USER ||--o{ SUBJECT : "creates"
    USER ||--o{ COURSE : "creates"
    SUBJECT ||--o{ COURSE : "contains"
    COURSE ||--o{ UNIT : "contains"
    UNIT ||--o{ UNIT_PREREQUISITE : "requires"
    UNIT ||--o{ LESSON : "contains"
    LESSON ||--o| QUIZ : "gated_by"
    QUIZ ||--o{ QUIZ_QUESTION : "has"

    USER ||--o{ STUDENT_ENROLLMENT : "has"
    COURSE ||--o{ STUDENT_ENROLLMENT : "has"
    USER ||--o{ UNIT_COMPLETION : "achieves"
    UNIT ||--o{ UNIT_COMPLETION : "achieved_by"
    USER ||--o{ QUIZ_SUBMISSION : "submits"
    QUIZ ||--o{ QUIZ_SUBMISSION : "receives"

    USER ||--o| STREAK : "maintains"
    USER ||--o| STUDENT_XP : "earns"

    USER ||--o{ GENERATED_PAPER : "generates"
    GENERATED_PAPER ||--o{ PAPER_QUESTION : "uses"
    QUESTION_BANK ||--o{ PAPER_QUESTION : "included_in"

    USER ||--o{ DOUBT_TICKET : "opens"
    LESSON ||--o{ DOUBT_TICKET : "receives"
    DOUBT_TICKET ||--o{ DOUBT_RESPONSE : "has"
    USER ||--o{ DOUBT_RESPONSE : "provides"

    USER ||--o| STUDENT_PERFORMANCE : "generates"
    USER ||--o{ WEAK_CONCEPT_TRACKING : "triggers"
```


## Django Model Breakdown (The 5 Apps)

### 1. `users` App
*The foundation mapping Role-Based Control.*
- **CustomUser**: Extends standard security. Defines if an account is a `Student`, `Teacher`, or `Admin`.

### 2. `courses` App
*The Content Hierarchy mapped to relational strictness.*
- **Subject**: Broad topic (e.g. "Science").
- **Course**: The track targeting a grade, pointing to a Subject.
- **Unit**: Clusters of lessons.
- **UnitPrerequisite**: A self-referential map to track interlocking logic (e.g., Unit B cannot unlock until Unit A is passed).
- **Lesson & Quiz**: The actual checkpoint gate restricting progression.

### 3. `activity` App (Enrollments)
*Tracks exact movement of students through the LMS.*
- **StudentEnrollment**: Which Course a Student claims.
- **UnitCompletion**: Written only when all underlying lesson quizzes pass.
- **QuizSubmission**: The actual pass/fail tracker driving XP triggers.

### 4. `gamification` App
*Separated logically to prevent heavy traffic collisions with course reads.*
- **Streak**: Tracks the current sequential days.
  - *Fix*: Anchored to the `date` field explicitly (e.g., `YYYY-MM-DD`). Comparing pure Dates solves the sliding 24-hour window bug.
- **StudentXP**: The global ledger of their points and level mapping.

### 5. `ai_engine` App
*The heavyweight integration solving Bank Seeding, PDFs, and Doubts.*
- **QuestionBank**: Centralized pool.
- **GeneratedPaper**: Holds the `secure_pdf_path`. Generation runs asynchronously via **Celery Workers**.
- **PaperQuestion (Many-to-Many)**: A bridge table mapping `GeneratedPaper` <> `QuestionBank`. 
- **DoubtTicket & DoubtResponse**: Processing bound to Celery image analysis. AI Responses are cached heavily in **Redis** before querying the LLM to save token costs.

### 6. `analytics` App (The AI Tutor Brain)
*Harvesting the goldmine of quiz data.*
- **StudentPerformance**: Aggregated macro-level statistics per student.
- **WeakConceptTracking**: Maps exactly which concept vectors the student fails. Actively triggers pop-up intervention guides ("You're struggling with X, revise Lesson Y").
