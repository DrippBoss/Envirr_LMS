"""
Reclassify questions whose chapter label is wrong by asking Groq to identify
the correct chapter from the question text.

Usage (inside Docker):
  docker exec envirr_lms-web-1 python manage.py reclassify_chapters \
      --subject Mathematics \
      --chapter "Statistics" \
      --api-key gsk_... \
      --batch-size 20

Groq identifies from the known NCERT Class 10 chapter list.
"""

import json
import re
import time

from django.core.management.base import BaseCommand, CommandError
from groq import Groq

from ai_engine.models import QuestionBank

NCERT_CHAPTERS = [
    "Real Numbers",
    "Polynomials",
    "Pair of Linear Equations in Two Variables",
    "Quadratic Equations",
    "Arithmetic Progressions",
    "Triangles",
    "Coordinate Geometry",
    "Introduction to Trigonometry",
    "Some Applications of Trigonometry",
    "Circles",
    "Areas Related to Circles",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability",
]

CLASSIFY_PROMPT = """You are a CBSE Class 10 Mathematics expert.
For each question below, identify which chapter it belongs to.

Choose ONLY from this list (return the exact string):
{chapter_list}

Return a JSON array with one object per question, in the same order:
[{{"id": <question_id>, "chapter": "<exact chapter name>"}}, ...]

Return ONLY the JSON array. No markdown, no explanation.

Questions:
{questions}"""


def _call_groq(client: Groq, model: str, batch: list[dict]) -> list[dict] | None:
    chapter_list = "\n".join(f"- {c}" for c in NCERT_CHAPTERS)
    q_lines = "\n".join(
        f'[{q["id"]}] {q["text"][:200]}' for q in batch
    )
    prompt = CLASSIFY_PROMPT.format(chapter_list=chapter_list, questions=q_lines)

    for attempt in range(4):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
                temperature=0.0,
            )
            raw = resp.choices[0].message.content.strip()
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
            return json.loads(raw)
        except Exception as exc:
            err = str(exc)
            if "429" in err or "rate_limit" in err.lower():
                wait = 60 * (attempt + 1)
                print(f"    Rate limited — waiting {wait}s (attempt {attempt+1}/4)...")
                time.sleep(wait)
            else:
                print(f"    GROQ ERROR: {exc}")
                return None
    return None


class Command(BaseCommand):
    help = "Reclassify wrongly-tagged chapter labels using Groq LLM"

    def add_arguments(self, parser):
        parser.add_argument("--subject",    required=True, help='e.g. "Mathematics"')
        parser.add_argument("--chapter",    required=True, help='Wrong chapter label to fix, e.g. "Statistics"')
        parser.add_argument("--api-key",    default="",    help="Groq API key")
        parser.add_argument("--model",      default="meta-llama/llama-4-scout-17b-16e-instruct")
        parser.add_argument("--batch-size", default=20,    type=int, help="Questions per API call")
        parser.add_argument("--delay",      default=3,     type=int, help="Seconds between batches")
        parser.add_argument("--dry-run",    action="store_true",     help="Print proposed changes without writing")

    def handle(self, *args, **options):
        import os
        api_key = options["api_key"] or os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise CommandError("Groq API key required. Pass --api-key or set GROQ_API_KEY env var.")

        subject     = options["subject"]
        wrong_ch    = options["chapter"]
        batch_size  = options["batch_size"]
        delay       = options["delay"]
        dry_run     = options["dry_run"]
        model       = options["model"]

        qs = QuestionBank.objects.filter(subject__iexact=subject, chapter=wrong_ch).order_by("id")
        total = qs.count()

        if total == 0:
            self.stdout.write(self.style.WARNING(f"No questions found for {subject} / {wrong_ch}"))
            return

        self.stdout.write(f"\nReclassifying {total} questions from \"{wrong_ch}\" | {subject}\n")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no DB writes.\n"))

        client = Groq(api_key=api_key)
        updated = 0
        unchanged = 0
        errors = 0

        questions = list(qs.values("id", "question_text"))
        batches = [questions[i:i+batch_size] for i in range(0, len(questions), batch_size)]

        for b_idx, batch in enumerate(batches):
            self.stdout.write(
                f"  Batch {b_idx+1}/{len(batches)} ({len(batch)} questions)...", ending=" "
            )

            payload = [{"id": q["id"], "text": q["question_text"]} for q in batch]
            result = _call_groq(client, model, payload)

            if not result:
                self.stdout.write(self.style.ERROR("FAILED"))
                errors += len(batch)
                time.sleep(delay)
                continue

            # Map id -> chapter from response
            id_to_chapter = {str(r["id"]): r["chapter"] for r in result if "id" in r and "chapter" in r}

            batch_updated = 0
            chapter_counts: dict[str, int] = {}
            for q in batch:
                new_ch = id_to_chapter.get(str(q["id"]))
                if not new_ch or new_ch not in NCERT_CHAPTERS:
                    unchanged += 1
                    continue
                chapter_counts[new_ch] = chapter_counts.get(new_ch, 0) + 1
                if new_ch == wrong_ch:
                    unchanged += 1
                    continue
                if not dry_run:
                    QuestionBank.objects.filter(id=q["id"]).update(chapter=new_ch)
                updated += 1
                batch_updated += 1

            summary = ", ".join(f"{ch}:{n}" for ch, n in sorted(chapter_counts.items()))
            self.stdout.write(self.style.SUCCESS(f"{batch_updated} updated") + f"  [{summary}]")

            if b_idx < len(batches) - 1:
                time.sleep(delay)

        self.stdout.write(self.style.SUCCESS(
            f"\nDone!  Updated: {updated}  Unchanged: {unchanged}  Errors: {errors}"
        ))
