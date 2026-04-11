import json
import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'envirr_backend.settings')
django.setup()

from learning.models import LearningNode, LessonQuestion, QuestionType

def seed_final_test():
    node_id = 12
    try:
        node = LearningNode.objects.get(id=node_id)
    except LearningNode.DoesNotExist:
        print(f"Error: Node {node_id} not found.")
        return

    # Clear existing questions for this node to avoid duplicates
    node.questions.all().delete()

    with open('ch1_real_numbers_full.json', 'r') as f:
        data = json.load(f)

    all_questions = data['questions']
    
    # Pick a variety of questions
    # 5 MCQs, 3 VERY_SHORT, 2 ASSERTION_REASON (if available, otherwise more MCQ/SHORT)
    mcqs = [q for q in all_questions if q['question_type'] == 'MCQ'][:6]
    shorts = [q for q in all_questions if q['question_type'] == 'VERY_SHORT'][:2]
    assertion_reasons = [q for q in all_questions if q['question_type'] == 'ASSERTION_REASON'][:2]

    selected = mcqs + shorts + assertion_reasons

    for idx, q_data in enumerate(selected):
        # Map JSON types to Course Model types
        q_type = QuestionType.MCQ
        if q_data['question_type'] == 'ASSERTION_REASON':
            q_type = QuestionType.MCQ # Represented as MCQ in current simpler model
        elif q_data['question_type'] == 'VERY_SHORT':
            q_type = QuestionType.FILL_BLANK # Or similar for textual answers
        
        # Build options_json
        options_map = {}
        correct_val = ""
        
        if 'options' in q_data:
            for opt in q_data['options']:
                options_map[opt['label']] = opt['text']
                if opt['is_correct']:
                    correct_val = opt['label']
        else:
            # For non-MCQ, correct_answer is verbatim
            correct_val = q_data.get('answer_text', '')

        LessonQuestion.objects.create(
            node=node,
            question_type=q_type,
            question_text=q_data['question_text'],
            options_json=options_map,
            correct_answer=correct_val,
            hint="",
            explanation=q_data.get('answer_text', ''),
            concept=q_data.get('concept', ''),
            order=idx
        )
        print(f"Added question: {q_data['question_text'][:50]}...")

    print(f"Total questions seeded for Node {node_id}: {node.questions.count()}")

if __name__ == "__main__":
    seed_final_test()
