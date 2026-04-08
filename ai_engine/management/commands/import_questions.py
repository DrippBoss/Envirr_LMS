import json
import os
import django
from django.core.management.base import BaseCommand
from ai_engine.models import QuestionBank

class Command(BaseCommand):
    help = 'Import questions from a JSON file into the QuestionBank'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to the JSON file containing questions')

    def handle(self, *args, **options):
        json_file_path = options['json_file']

        if not os.path.exists(json_file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {json_file_path}"))
            return

        try:
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            global_metadata = {}
            if not isinstance(data, list):
                if isinstance(data, dict) and 'questions' in data and isinstance(data['questions'], list):
                    global_metadata = {
                        'subject': data.get('subject', 'Unknown Subject'),
                        'chapter': data.get('chapter', 'Unknown Chapter')
                    }
                    data = data['questions']
                else:
                    self.stdout.write(self.style.ERROR("JSON data must be a list of question objects or a dict with a 'questions' list."))
                    return

            from pydantic import ValidationError
            from ai_engine.validators import ExtractedQuestion
            from ai_engine.models import FailedIngestion

            created_count = 0
            for item in data:
                try:
                    # Inject global metadata if missing
                    if 'subject' not in item:
                        item['subject'] = global_metadata.get('subject', 'Unknown Subject')
                    if 'chapter' not in item:
                        item['chapter'] = global_metadata.get('chapter', 'Unknown Chapter')

                    # Run Pydantic validation
                    validated_item = ExtractedQuestion(**item)
                    
                    q_bank = QuestionBank.objects.create(
                        subject=validated_item.subject,
                        chapter=validated_item.chapter,
                        concept=item.get('concept', ''),
                        question_type=validated_item.question_type,
                        marks=validated_item.marks,
                        difficulty=validated_item.difficulty,
                        question_text=validated_item.question_text,
                        answer_text=validated_item.answer_text,
                        is_ai_generated=item.get('is_ai_generated', False)
                    )
                    
                    # If MCQ, let's ingest options
                    if validated_item.options:
                        from ai_engine.models import MCQOption
                        for opt in validated_item.options:
                            MCQOption.objects.create(
                                question=q_bank,
                                option_label=opt.option_label,
                                option_text=opt.option_text,
                                is_correct=opt.is_correct,
                                order=opt.order
                            )
                            
                    # Handle case study ingestion logic
                    if validated_item.parts:
                        from ai_engine.models import CaseStudyPart
                        for part in validated_item.parts:
                            CaseStudyPart.objects.create(
                                parent_question=q_bank,
                                part_number=part.part_number,
                                part_text=part.part_text,
                                part_answer=part.part_answer,
                                question_type=part.question_type,
                                marks=part.marks
                            )
                            
                    created_count += 1
                except ValidationError as ve:
                    self.stdout.write(self.style.ERROR(f"Validation Error skipped item. See FailedIngestion table."))
                    FailedIngestion.objects.create(
                        raw_json=json.dumps(item),
                        error_reason=str(ve.errors())
                    )
                except django.db.utils.IntegrityError:
                    self.stdout.write(self.style.WARNING(f"Skipped duplicate question: {item.get('question_text', 'N/A')[:50]}..."))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to import question: {item.get('question_text', 'N/A')[:50]}... Error: {e}"))

            self.stdout.write(self.style.SUCCESS(f"Successfully imported {created_count} questions."))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"An error occurred: {e}"))
