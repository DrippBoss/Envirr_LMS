import json
import re
import os
import django
from django.core.management.base import BaseCommand
from ai_engine.models import QuestionBank, MCQOption, CaseStudyPart, FailedIngestion
from ai_engine.validators import ExtractedQuestion
from pydantic import ValidationError


class Command(BaseCommand):
    help = 'Import questions from a JSON file (or multiple concatenated arrays) into the QuestionBank'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to the JSON file')
        parser.add_argument('--board', default='CBSE', help='Board name (default: CBSE)')
        parser.add_argument('--class_grade', default='10', help='Class grade (default: 10)')
        parser.add_argument('--dry-run', action='store_true', help='Validate only, do not write to DB')

    def handle(self, *args, **options):
        json_file_path = options['json_file']
        board = options['board']
        class_grade = options['class_grade']
        dry_run = options['dry_run']

        if not os.path.exists(json_file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {json_file_path}"))
            return

        # ── Parse JSON — handles single array OR multiple concatenated arrays ──
        with open(json_file_path, 'r', encoding='utf-8') as f:
            raw = f.read().strip()

        # Join multiple arrays: ][  →  ,
        raw = re.sub(r'\]\s*\[', ',', raw)

        # Fix invalid JSON escape sequences from LaTeX (e.g. \R, \D, \f not \n\t\r etc.)
        valid_escapes = set('"\\bfnrtu/')
        def fix_escapes(m):
            char = m.group(1)
            if char in valid_escapes:
                return m.group(0)
            return '\\\\' + char
        raw = re.sub(r'\\(.)', fix_escapes, raw)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f"JSON parse error: {e}"))
            return

        if not isinstance(data, list):
            self.stdout.write(self.style.ERROR("JSON must be a list of question objects."))
            return

        self.stdout.write(f"Found {len(data)} questions. Starting import...")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — nothing will be written."))

        created = skipped = errors = 0

        for idx, item in enumerate(data, 1):
            q_preview = str(item.get('question_text', ''))[:60]
            try:
                # ── Validate with Pydantic ──────────────────────────────────
                validated = ExtractedQuestion(**item)

                if dry_run:
                    self.stdout.write(f"  [OK] {idx}. {q_preview}")
                    created += 1
                    continue

                # ── Create QuestionBank entry ───────────────────────────────
                q, was_created = QuestionBank.objects.get_or_create(
                    subject=validated.subject,
                    chapter=validated.chapter,
                    question_text=validated.question_text,
                    defaults={
                        'concept':           validated.concept,
                        'question_type':     validated.question_type,
                        'marks':             validated.marks,
                        'difficulty':        validated.difficulty,
                        'bloom_level':       validated.bloom_level,
                        'answer_text':       validated.answer_text,
                        'has_image':         validated.has_image,
                        'image_description': validated.image_description,
                        'tags':              validated.tags,
                        'is_verified':       True,
                        'is_ai_generated':   False,
                    }
                )

                if not was_created:
                    self.stdout.write(self.style.WARNING(f"  [SKIP] #{idx} duplicate: {q_preview}"))
                    skipped += 1
                    continue

                # ── MCQ / ASSERTION_REASON options ──────────────────────────
                if validated.options:
                    for i, opt in enumerate(validated.options):
                        MCQOption.objects.create(
                            question=q,
                            option_label=opt.option_label.upper(),
                            option_text=opt.option_text,
                            is_correct=opt.is_correct,
                            order=i,
                        )

                # ── Case study parts ────────────────────────────────────────
                if validated.parts:
                    for part in validated.parts:
                        CaseStudyPart.objects.create(
                            parent_question=q,
                            part_number=part.part_number,
                            part_text=part.part_text,
                            part_answer=part.part_answer,
                            question_type=part.question_type,
                            marks=part.marks,
                            has_image=part.has_image,
                            image_description=part.image_description,
                        )

                self.stdout.write(self.style.SUCCESS(f"  [CREATED] #{idx} {validated.question_type} — {q_preview}"))
                created += 1

            except ValidationError as ve:
                errors += 1
                self.stdout.write(self.style.ERROR(f"  [INVALID] #{idx} {q_preview} → {ve.errors()[0]['msg']}"))
                if not dry_run:
                    FailedIngestion.objects.create(
                        raw_json=json.dumps(item, ensure_ascii=False),
                        error_reason=str(ve.errors()),
                    )

            except django.db.utils.IntegrityError:
                skipped += 1
                self.stdout.write(self.style.WARNING(f"  [SKIP] #{idx} hash collision (duplicate): {q_preview}"))

            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(f"  [ERROR] #{idx} {q_preview} → {e}"))

        # ── Summary ─────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.SUCCESS(f"Created:  {created}"))
        self.stdout.write(self.style.WARNING(f"Skipped:  {skipped} (duplicates)"))
        self.stdout.write(self.style.ERROR(  f"Errors:   {errors}") if errors else f"Errors:   {errors}")
        self.stdout.write("=" * 60)
