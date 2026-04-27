# Graph Report - .  (2026-04-11)

## Corpus Check
- 168 files · ~6,319,272 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 284 nodes · 1085 edges · 30 communities detected
- Extraction: 27% EXTRACTED · 73% INFERRED · 0% AMBIGUOUS · INFERRED: 787 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `CourseUnit` - 44 edges
2. `LearningPath` - 44 edges
3. `LearningNode` - 44 edges
4. `LessonQuestion` - 38 edges
5. `Flashcard` - 38 edges
6. `RevisionNode` - 38 edges
7. `FlashcardDeck` - 38 edges
8. `NodeProgress` - 37 edges
9. `RevisionNodeProgress` - 36 edges
10. `FlashcardProgress` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Difficulty` --uses--> `Lesson`  [INFERRED]
  ai_engine\models.py → courses\models.py
- `BloomLevel` --uses--> `Lesson`  [INFERRED]
  ai_engine\models.py → courses\models.py
- `IngestionStatus` --uses--> `Lesson`  [INFERRED]
  ai_engine\models.py → courses\models.py
- `Verify strictly if a user possesses the rights to consume course contents.` --uses--> `StudentEnrollment`  [INFERRED]
  courses\services.py → activity\models.py
- `Meta` --uses--> `Lesson`  [INFERRED]
  learning\models.py → courses\models.py

## Communities

### Community 0 - "Course/Activity Domain Models"
Cohesion: 0.08
Nodes (36): BloomLevel, CompletionStatus, Course, DeckPurpose, Difficulty, FlashcardType, IngestionStatus, Meta (+28 more)

### Community 1 - "AI Question Generation Admin"
Cohesion: 0.11
Nodes (27): PaperQuestionInline, PaperSectionAdmin, QuestionBankAdmin, QuestionPaperAdmin, BaseCommand, Command, CaseStudyPart, DoubtResponse (+19 more)

### Community 2 - "Core LMS Models"
Cohesion: 0.22
Nodes (21): CourseUnit, Flashcard, LearningNode, RevisionNode, CourseUnitSerializer, FlashcardDeckSerializer, FlashcardSerializer, FullLearningNodeSerializer (+13 more)

### Community 3 - "Django Admin Configuration"
Cohesion: 0.39
Nodes (18): ContentTemplateAdmin, CourseUnitAdmin, DeckCardInline, FlashcardAdmin, FlashcardDeckAdmin, LearningNodeAdmin, LearningPathAdmin, LessonQuestionInline (+10 more)

### Community 4 - "Streak & XP API Views"
Cohesion: 0.11
Nodes (15): APIView, Streak, StudentXP, can_unlock_unit(), check_enrollment_access(), complete_unit_if_eligible(), evaluate_quiz(), get_fresh_questions() (+7 more)

### Community 5 - "Learning Path Views & URLs"
Cohesion: 0.29
Nodes (8): LearningPath, AdminWizardBaseView, post(), Base view for Course Wizard endpoints.     Strictly restricts access to user acc, WizardBulkUploadView, WizardCourseCreateView, WizardReorderView, WizardTemplateListView

### Community 6 - "Progress & Serializers"
Cohesion: 0.22
Nodes (4): NodeProgress, LearningPathSerializer, RevisionNodeSerializer, SimpleLearningNodeSerializer

### Community 7 - "User Auth & Registration"
Cohesion: 0.29
Nodes (7): AbstractUser, CustomUser, RegisterSerializer, StudentProfileSerializer, UserSerializer, RegisterView, UserDetailView

### Community 8 - "Celery Tasks"
Cohesion: 0.39
Nodes (6): _build_prompt(), calculate_marks_distribution(), compile_manual_paper_task(), construct_latex(), generate_paper_task(), process_latex_text()

### Community 9 - "App Configurations"
Cohesion: 0.43
Nodes (7): AppConfig, ActivityConfig, AiEngineConfig, CoursesConfig, GamificationConfig, LearningConfig, UsersConfig

### Community 10 - "Validators & Schemas"
Cohesion: 0.47
Nodes (4): BaseModel, CaseStudyPartSchema, ExtractedQuestion, MCQOptionSchema

### Community 11 - "Lesson Question Views"
Cohesion: 0.4
Nodes (2): LessonQuestion, UnitPrerequisitesView

### Community 12 - "Flashcard Deck Views"
Cohesion: 0.5
Nodes (2): FlashcardDeck, RevisionNodeDetailView

### Community 13 - "Node Practice Views"
Cohesion: 0.5
Nodes (0): 

### Community 14 - "Manage.py"
Cohesion: 0.67
Nodes (2): main(), Run administrative tasks.

### Community 15 - "DRF"
Cohesion: 1.0
Nodes (1): # NOTE: Enrollment enforcement logic can be bound here optionally.

### Community 16 - "Test Seed Scripts"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Ollama Test"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Ollama JSON Test"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Initial Migration"
Cohesion: 1.0
Nodes (1): Migration

### Community 20 - "ASGI Config"
Cohesion: 1.0
Nodes (1): ASGI config for envirr_backend project.  It exposes the ASGI callable as a mod

### Community 21 - "WSGI Config"
Cohesion: 1.0
Nodes (1): WSGI config for envirr_backend project.  It exposes the WSGI callable as a mod

### Community 22 - "ContentTemplate Migration"
Cohesion: 1.0
Nodes (1): Migration

### Community 23 - "StudentProfile Migration"
Cohesion: 1.0
Nodes (1): Migration

### Community 24 - "Progress Standalone"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Celery Standalone"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Frontend Standalone"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Llama Logic Standalone"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Tests Standalone"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Settings Standalone"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **7 isolated node(s):** `Run administrative tasks.`, `# NOTE: Enrollment enforcement logic can be bound here optionally.`, `Migration`, `ASGI config for envirr_backend project.  It exposes the ASGI callable as a mod`, `WSGI config for envirr_backend project.  It exposes the WSGI callable as a mod` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `DRF`** (2 nodes): `scaffold_drf.py`, `# NOTE: Enrollment enforcement logic can be bound here optionally.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Seed Scripts`** (2 nodes): `seed_final_test.py`, `seed_final_test()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Ollama Test`** (2 nodes): `test_ollama.py`, `test_ollama()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Ollama JSON Test`** (2 nodes): `test_ollama_json.py`, `test_ollama_json()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Initial Migration`** (2 nodes): `0001_initial.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ASGI Config`** (2 nodes): `asgi.py`, `ASGI config for envirr_backend project.  It exposes the ASGI callable as a mod`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WSGI Config`** (2 nodes): `wsgi.py`, `WSGI config for envirr_backend project.  It exposes the WSGI callable as a mod`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ContentTemplate Migration`** (2 nodes): `0002_contenttemplate.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `StudentProfile Migration`** (2 nodes): `0002_studentprofile.py`, `Migration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Progress Standalone`** (1 nodes): `reset_progress.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Celery Standalone`** (1 nodes): `scaffold_celery.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Standalone`** (1 nodes): `scaffold_frontend.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Llama Logic Standalone`** (1 nodes): `scaffold_llama_logic.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tests Standalone`** (1 nodes): `tests.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Standalone`** (1 nodes): `settings.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `QuestionBank` connect `AI Question Generation Admin` to `Course/Activity Domain Models`, `Core LMS Models`, `Streak & XP API Views`, `Lesson Question Views`, `Flashcard Deck Views`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `Command` connect `AI Question Generation Admin` to `Validators & Schemas`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Meta` connect `Course/Activity Domain Models` to `AI Question Generation Admin`, `Core LMS Models`, `Django Admin Configuration`, `Learning Path Views & URLs`, `Progress & Serializers`, `User Auth & Registration`, `Lesson Question Views`, `Flashcard Deck Views`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 42 inferred relationships involving `CourseUnit` (e.g. with `DeckCardInline` and `LessonQuestionInline`) actually correct?**
  _`CourseUnit` has 42 INFERRED edges - model-reasoned connections that need verification._
- **Are the 42 inferred relationships involving `LearningPath` (e.g. with `DeckCardInline` and `LessonQuestionInline`) actually correct?**
  _`LearningPath` has 42 INFERRED edges - model-reasoned connections that need verification._
- **Are the 42 inferred relationships involving `LearningNode` (e.g. with `DeckCardInline` and `LessonQuestionInline`) actually correct?**
  _`LearningNode` has 42 INFERRED edges - model-reasoned connections that need verification._
- **Are the 36 inferred relationships involving `LessonQuestion` (e.g. with `DeckCardInline` and `LessonQuestionInline`) actually correct?**
  _`LessonQuestion` has 36 INFERRED edges - model-reasoned connections that need verification._