# Envirr LMS: Course Methodology & Gamification Strategy

## 1. Pedagogical Methodology

The Envirr LMS employs a **Video-First, Concept-Driven Methodology** coupled with **Adaptive Remediation**. Rather than a static list of reading materials and disjointed tests, learning is structured linearly but adaptively.

### Video-First Learning Flow
- Students cannot simply guess their way through exams. The system strictly enforces a **Video-First entry state** (via the `NodeStep` model: `NOT_STARTED` → `VIDEO_DONE` → `PRACTICE`).
- A student must interact with the video or theoretical placeholder *before* unlocking practice questions. This ensures fundamental conceptual understanding precedes practical application.
- *Exceptions exist:* Advanced students can use a "Skip — I already know this" mechanic to bypass if they are confident.

### Adaptive Spaced Repetition & Flashcards
- **Flashcard Decks:** Used for course prerequisites, side-revision elements, and post-node summaries. They break down knowledge into `CONCEPT`, `FORMULA`, `EXAMPLE`, and `MNEMONIC` chunks.
- **Weak Spots Tracking:** If a student answers a question incorrectly, the system links the failure to the underlying `concept` and logs it in a `WeakSpot` model. This allows the LMS to adapt and serve targeted revisions.

### Interactive "Active" Recall
- Instead of relying entirely on Multiple Choice Questions (MCQs), the platform utilizes interactive, high-engagement question types such as:
  - **Rearrange / Picker** (Duolingo-style sentence or logic building)
  - **Proof Puzzles**
  - **Match** and **Fill in the Blank**

---

## 2. Course Structure & Architecture

The course architecture moves away from traditional folder structures and adopts a **Skill Tree / Learning Map** mapping.

### The Hierarchy
1. **CourseUnit (Subject/Class):** The macro container (e.g., *9th Grade Math*).
2. **LearningPath (Chapter/Module):** A specific topic area comprising a sequential path of nodes.
3. **LearningNode:** The core interactive unit. Can be a `LESSON` or a `CHAPTER_TEST`.
   - Each node contains a theoretical element (Video/URL/Flashcard), a set of `practice_question_count`, and a configured pass percentage.
4. **RevisionNodes:** Optional or mandatory side-nodes that branch off the main path for specialized practice or remediation.

Everything is organized primarily by an `order` field, creating a visually traceable "path" for the student to follow.

---

## 3. Hook & Engagement Strategy (Gamification)

The platform is explicitly designed to "hook" the user by borrowing heavily from successful mobile gaming and language-learning apps (like Duolingo), wrapped in a premium **"Digital Observatory" / Mission-Control aesthetic**.

### 1. The "Lives" (HP) System
- **Stakes & Friction:** Students start a node with a set number of `starting_lives` (e.g., 3 lives). Incorrect answers cost lives. If they lose all lives, they fail the node and may be forced to review the theory. 
- *Why it hooks:* It introduces real stakes to practice, stopping students from blindly guessing and making every question feel important. 

### 2. Daily Streaks
- **Fear of Missing Out (FOMO):** The `Streak` model tracks the `current_streak` and `longest_streak`.
- *Why it hooks:* It builds a daily habit. Breaking a streak is psychologically painful, compelling students to log in and complete at least one node daily.

### 3. XP Progression and Leveling
- Students are rewarded `xp_reward` for completing `LearningNodes` and `RevisionNodes`.
- This feeds into an overarching `StudentXP` profile which translates to a `current_level`.
- *Why it hooks:* A sense of constant forward momentum. Even if a student struggles with a concept, they see their total XP growing, validating their time investment.

### 4. Visual Progress & "Map" Unlocking
- The structural use of `LOCKED`, `IN_PROGRESS`, and `COMPLETED` node states is mapped visually to an interactive learning path.
- *Why it hooks:* Humans are completionists. Seeing a path slowly turn from locked grey nodes to completed, colorful, "starred" nodes provides a strong dopamine hit and clear visual feedback of their journey.
