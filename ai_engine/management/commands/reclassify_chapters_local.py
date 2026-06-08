"""
Reclassify question chapters using local keyword/pattern scoring — no API needed.

Usage:
  docker exec envirr_lms-web-1 python manage.py reclassify_chapters_local \
      --subject Mathematics [--dry-run]

Each question text is scored against per-chapter keyword lists.
The chapter with the highest score wins (ties keep the current value).
"""

import re
from collections import defaultdict
from django.core.management.base import BaseCommand
from ai_engine.models import QuestionBank

# ---------------------------------------------------------------------------
# Keyword rules: (pattern, weight)
# Higher weight = stronger signal for that chapter.
# Patterns are matched case-insensitively against the full question text.
# ---------------------------------------------------------------------------
CHAPTER_RULES: dict[str, list[tuple[str, int]]] = {
    "Real Numbers": [
        (r"\bHCF\b",                     10),
        (r"\bLCM\b",                     10),
        (r"\beuclid",                    10),
        (r"prime\s+factor",               8),
        (r"fundamental\s+theorem",        8),
        (r"irrational\s+number",          8),
        (r"rational\s+number",            6),
        (r"terminating\s+decimal",        8),
        (r"non.terminating",              8),
        (r"decimal\s+expansion",          8),
        (r"\bcomposite\b",                5),
    ],

    "Polynomials": [
        (r"\bpolynomial\b",               8),
        (r"\bzeroes?\b",                  7),
        (r"zeros?\s+of",                  7),
        (r"p\(x\)",                       6),
        (r"cubic\s+polynomial",           9),
        (r"quadratic\s+polynomial",       9),
        (r"coefficient\s+of",             5),
        (r"degree\s+of\s+poly",           7),
        (r"sum\s+of\s+zer",               8),
        (r"product\s+of\s+zer",           8),
    ],

    "Pair of Linear Equations in Two Variables": [
        (r"pair\s+of\s+linear",          12),
        (r"linear\s+equation.*two\s+var", 12),
        (r"two\s+variable",               8),
        (r"\bconsistent\b",               8),
        (r"\binconsistent\b",             8),
        (r"\bdependent\b",                6),
        (r"substitution\s+method",        8),
        (r"elimination\s+method",         8),
        (r"cross.multiplication",         8),
        (r"infinite\s+solution",          7),
        (r"unique\s+solution",            6),
        (r"no\s+solution",                5),
        (r"\ba_1.*a_2\b",                 6),
        (r"\bb_1.*b_2\b",                 6),
    ],

    "Quadratic Equations": [
        (r"quadratic\s+equation",        10),
        (r"\bdiscriminant\b",            10),
        (r"nature\s+of\s+root",          10),
        (r"ax\^?2.*bx.*c",               8),
        (r"completing\s+the\s+square",    9),
        (r"quadratic\s+formula",          9),
        (r"sum\s+of\s+root",              7),
        (r"product\s+of\s+root",          7),
        (r"equal\s+root",                 7),
        (r"real\s+.*root",                5),
        (r"b\^?2\s*-\s*4ac",             10),
    ],

    "Arithmetic Progressions": [
        (r"arithmetic\s+progression",    12),
        (r"\bA\.?P\.?\b",                 9),
        (r"common\s+difference",         10),
        (r"nth\s+term",                   8),
        (r"\ba_n\b",                      7),
        (r"\bS_n\b",                      7),
        (r"sum\s+of\s+(first|n)\s+term",  9),
        (r"first\s+term.*common\s+diff",  9),
        (r"last\s+term\s+of\s+(an|the)\s+AP", 10),
        (r"general\s+term",               6),
    ],

    "Triangles": [
        (r"similar\s+triangle",          12),
        (r"\bBPT\b",                     12),
        (r"basic\s+proportionality",     12),
        (r"pythagoras",                  12),
        (r"AA\s+similarity",             11),
        (r"SAS\s+similarity",            11),
        (r"SSS\s+similarity",            11),
        (r"DE\s*\\\|\\\|\s*BC|DE\s*\|+\s*BC", 11),
        (r"PQ\s*\\\|\\\|\s*BC|PQ\s*\|+\s*BC", 10),
        (r"congruent",                    8),
        (r"sim.*\\triangle|\\triangle.*sim", 9),
        (r"corresponding\s+sides",        8),
        (r"hypotenuse",                   9),
        (r"∼\s*△|△.*∼",                   9),
        (r"\\triangle\s*ABC.*\\triangle\s*[A-Z]", 9),
        (r"similar.*figure|figure.*similar", 7),
    ],

    "Coordinate Geometry": [
        (r"coordinate",                   7),
        (r"distance\s+formula",          10),
        (r"section\s+formula",           10),
        (r"mid.?point",                   8),
        (r"collinear",                    9),
        (r"abscissa|ordinate",            9),
        (r"x.axis|y.axis",                6),
        (r"area\s+of.*triangle.*point",   8),
        (r"\(\s*x_?1\s*,\s*y_?1\s*\)",   7),
        (r"centroid",                     9),
        (r"point.*divides",               6),
    ],

    "Introduction to Trigonometry": [
        (r"trigonometric\s+(ratio|identity|function)", 12),
        (r"\bsin\s*[A-Z0-9(θ]",           7),
        (r"\bcos\s*[A-Z0-9(θ]",           7),
        (r"\btan\s*[A-Z0-9(θ]",           7),
        (r"\bcosec\b",                    8),
        (r"\bcot\b",                      7),
        (r"sin\^?2.*cos\^?2|cos\^?2.*sin\^?2", 9),
        (r"1\s*\+\s*tan\^?2|sec\^?2",    9),
        (r"evaluate.*sin|find.*sin|sin.*find", 6),
        (r"sin\s*30|cos\s*45|tan\s*60",   8),
        (r"sin\s*A\s*/\s*cos\s*A",        8),
        (r"right.*angle.*triangle.*trig|trig.*right.*angle", 7),
    ],

    "Some Applications of Trigonometry": [
        (r"angle\s+of\s+elevation",      12),
        (r"angle\s+of\s+depression",     12),
        (r"height\s+and\s+distance",     12),
        (r"\btower\b",                    7),
        (r"\blighthouse\b",               9),
        (r"\bpole\b.*height|height.*\bpole\b", 7),
        (r"\bshadow\b",                   8),
        (r"\bkite\b",                     6),
        (r"horizontal\s+level",           7),
        (r"top\s+of.*tower|bottom\s+of.*tower", 8),
    ],

    "Circles": [
        (r"tangent.*circle|circle.*tangent", 10),
        (r"\btangent\b",                  7),
        (r"\bchord\b",                    7),
        (r"\bsecant\b",                   9),
        (r"cyclic\s+quad",               10),
        (r"external\s+point.*tangent",   10),
        (r"tangent.*external\s+point",   10),
        (r"length\s+of\s+tangent",       10),
        (r"PA\s*=\s*PB",                  8),
        (r"point\s+of\s+contact",         8),
        (r"tangent.*perpendicular.*radius|radius.*perpendicular.*tangent", 10),
        (r"number\s+of\s+tangent",        9),
        (r"two\s+circle",                 6),
        (r"common\s+tangent",            10),
        (r"\bchord.*bisect|bisect.*chord",  7),
        (r"AOBP.*cyclic|cyclic.*AOBP",    9),
    ],

    "Areas Related to Circles": [
        (r"area\s+of\s+sector",          12),
        (r"area\s+of\s+segment",         12),
        (r"arc\s+length",                10),
        (r"minor\s+sector|major\s+sector", 10),
        (r"minor\s+segment|major\s+segment", 10),
        (r"perimeter\s+of\s+sector",     10),
        (r"angle.*sector|sector.*angle",  8),
        (r"quadrant.*area|area.*quadrant", 8),
        (r"semicircle.*area|area.*semicircle", 8),
        (r"θ/360.*πr|πr.*θ/360",         9),
        (r"ring.*area|annulus",           8),
    ],

    "Surface Areas and Volumes": [
        (r"surface\s+area",              10),
        (r"\bvolume\b",                   8),
        (r"\bcone\b",                     8),
        (r"\bcylinder\b",                 8),
        (r"\bsphere\b",                   8),
        (r"\bhemisphere\b",               9),
        (r"\bcuboid\b",                   9),
        (r"\bfrustum\b",                  10),
        (r"slant\s+height",               9),
        (r"total\s+surface",              8),
        (r"curved\s+surface",             9),
        (r"melted.*recast|recast.*melted", 9),
        (r"solid.*shape|shape.*solid",    6),
    ],

    "Statistics": [
        (r"\bmean\b",                     7),
        (r"\bmedian\b",                   9),
        (r"\bmode\b",                     9),
        (r"frequency\s+distribution",    10),
        (r"\bhistogram\b",               10),
        (r"\bogive\b",                   10),
        (r"cumulative\s+frequency",      10),
        (r"class\s+interval",             9),
        (r"class\s+mark",                 9),
        (r"assumed\s+mean",               9),
        (r"step\s+deviation",             9),
        (r"lower\s+limit|upper\s+limit",  7),
    ],

    "Probability": [
        (r"\bprobability\b",             14),
        (r"sample\s+space",              12),
        (r"favourable\s+outcome",        12),
        (r"equally\s+likely",            11),
        (r"random\s+experiment",         12),
        (r"playing\s+card|deck\s+of\s+card", 11),
        (r"tossing.*coin|coin.*toss",    11),
        (r"throwing.*die|die.*thrown",   11),
        (r"complementary\s+event",       11),
        (r"P\s*\(\s*[A-Z]\s*\)",         8),   # P(A) or P(E) — not P(x,y)
    ],
}


def score_question(text: str) -> dict[str, int]:
    scores: dict[str, int] = {}
    t = text.lower()
    for chapter, rules in CHAPTER_RULES.items():
        s = 0
        for pattern, weight in rules:
            if re.search(pattern, t, re.IGNORECASE):
                s += weight
        if s > 0:
            scores[chapter] = s
    return scores


def classify(text: str) -> tuple[str | None, int]:
    """Return (best_chapter, score) or (None, 0) if no signal."""
    scores = score_question(text)
    if not scores:
        return None, 0
    best = max(scores, key=lambda k: scores[k])
    return best, scores[best]


class Command(BaseCommand):
    help = "Reclassify question chapters using local keyword scoring (no API)"

    def add_arguments(self, parser):
        parser.add_argument("--subject",          default="Mathematics")
        parser.add_argument("--from-chapter",     default="",  help="Only fix this chapter (blank = all)")
        parser.add_argument("--min-score",        default=7,   type=int, help="Min confidence score to reclassify")
        parser.add_argument("--dry-run",          action="store_true")
        parser.add_argument("--show-uncertain",   action="store_true", help="Print questions with no clear winner")

    def handle(self, *args, **options):
        subject       = options["subject"]
        from_chapter  = options["from_chapter"]
        min_score     = options["min_score"]
        dry_run       = options["dry_run"]
        show_unc      = options["show_uncertain"]

        qs = QuestionBank.objects.filter(subject__iexact=subject)
        if from_chapter:
            qs = qs.filter(chapter=from_chapter)
        qs = qs.order_by("chapter", "id")

        total = qs.count()
        self.stdout.write(f"\nScanning {total} questions | subject={subject}"
                          + (f" | chapter={from_chapter}" if from_chapter else "") + "\n")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no writes.\n"))

        moved: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        unchanged = skipped = 0
        change_tally: dict[str, int] = defaultdict(int)

        for q in qs.iterator():
            new_ch, score = classify(q.question_text)

            if not new_ch or score < min_score:
                skipped += 1
                if show_unc:
                    self.stdout.write(
                        f"  [UNCERTAIN score={score}] id={q.id} ch={q.chapter} | "
                        f"{q.question_text[:80]}"
                    )
                continue

            if new_ch == q.chapter:
                unchanged += 1
                continue

            moved[q.chapter][new_ch] += 1
            change_tally[f"{q.chapter} → {new_ch}"] += 1

            if not dry_run:
                QuestionBank.objects.filter(id=q.id).update(chapter=new_ch)

        # Summary
        self.stdout.write("\n=== Changes ===")
        for label, count in sorted(change_tally.items(), key=lambda x: -x[1]):
            self.stdout.write(f"  {label}: {count}")

        updated = sum(change_tally.values())
        self.stdout.write(self.style.SUCCESS(
            f"\nDone!  Updated={updated}  Unchanged={unchanged}  Uncertain/skipped={skipped}"
        ))

        # Print final chapter distribution
        self.stdout.write("\n=== Post-run distribution ===")
        from django.db.models import Count
        rows = (QuestionBank.objects.filter(subject__iexact=subject)
                .values("chapter").annotate(n=Count("id")).order_by("chapter"))
        for row in rows:
            self.stdout.write(f"  {row['chapter']:<50} {row['n']:>4}")
