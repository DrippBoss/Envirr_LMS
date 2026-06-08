"""
Run with: docker exec envirr_lms-web-1 python fix_ap_latex.py
Preview mode by default. Pass --apply to commit changes.
"""
import sys, os, re
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'envirr_backend.settings')

import django
django.setup()

from ai_engine.models import QuestionBank

APPLY = '--apply' in sys.argv

DIRTY_CHAPTERS = [
    'Areas Related to Circles',
    'Circles',
    'Introduction to Trigonometry',
    'Polynomials',
    'Probability',
    'Quadratic Equations',
    'Real Numbers',
    'Some Applications of Trigonometry',
]

# ── Unicode maps ─────────────────────────────────────────────────────────────
SUB_DIGITS = str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉')
SUP_MAP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'}
SUB_LETTERS = {'n':'ₙ','m':'ₘ','p':'ₚ','k':'ₖ','q':'q','i':'ᵢ','r':'ᵣ'}

def sup_str(s):
    out = ''
    for c in s:
        if c in SUP_MAP:
            out += SUP_MAP[c]
        else:
            out += c   # letters/symbols stay as-is in superscript context
    return out

def sub_str(s):
    out = ''
    for c in s:
        if c.isdigit():
            out += c.translate(SUB_DIGITS)
        elif c in SUB_LETTERS:
            out += SUB_LETTERS[c]
        elif c == '+':
            out += '₊'
        elif c == '-':
            out += '₋'
        else:
            out += c
    return out

FRAC_UNICODE = {
    ('1','2'): '½', ('1','3'): '⅓', ('2','3'): '⅔',
    ('1','4'): '¼', ('3','4'): '¾',
    ('1','5'): '⅕', ('2','5'): '⅖', ('3','5'): '⅗', ('4','5'): '⅘',
    ('1','6'): '⅙', ('5','6'): '⅚',
    ('1','8'): '⅛', ('3','8'): '⅜', ('5','8'): '⅝', ('7','8'): '⅞',
}

def frac_str(num, den):
    return FRAC_UNICODE.get((num, den), f'{num}/{den}')

def clean_latex(text):
    # strip \[...\] display math delimiters
    text = re.sub(r'\\\[', '', text)
    text = re.sub(r'\\\]', '', text)

    # degree symbol — must run before general superscript handler
    text = re.sub(r'\^\{\\circ\}', '°', text)
    text = re.sub(r'\^\\circ',     '°', text)
    text = re.sub(r'\\circ',       '°', text)
    text = re.sub(r'\\degree',     '°', text)

    # trig/log functions: \sin → sin etc.
    for fn in ['sin', 'cos', 'tan', 'cot', 'sec', 'cosec', 'log', 'ln']:
        text = text.replace(f'\\{fn}', fn)

    # mixed fractions: 4\frac{1}{2} → 4½   (must run before plain \frac)
    def replace_mixed(m):
        whole, num, den = m.group(1), m.group(2), m.group(3)
        return whole + frac_str(num, den)
    text = re.sub(r'(-?\d+)\\frac\{(\d+)\}\{(\d+)\}', replace_mixed, text)

    # plain \frac{a}{b} → a/b  (or unicode fraction)
    def replace_frac(m):
        num, den = m.group(1).strip(), m.group(2).strip()
        return frac_str(num, den) if (num.isdigit() and den.isdigit()) else f'{num}/{den}'
    text = re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', replace_frac, text)

    # \sqrt{x} → √x  (no parentheses for simple single tokens)
    def replace_sqrt(m):
        inner = m.group(1).strip()
        if re.match(r'^[\w.]+$', inner):   # simple: digit, letter, or decimal
            return '√' + inner
        return '√(' + inner + ')'
    text = re.sub(r'\\sqrt\{([^{}]+)\}', replace_sqrt, text)
    text = re.sub(r'\\sqrt\s*(\d+)', lambda m: '√' + m.group(1), text)

    # superscripts  ^{th}, ^{2}, ^{nd} …
    text = re.sub(r'\^\{([^{}]+)\}', lambda m: sup_str(m.group(1)), text)
    text = re.sub(r'\^(\d)', lambda m: SUP_MAP.get(m.group(1), m.group(1)), text)

    # subscripts  _{n},  _{18},  _{n-1} …
    text = re.sub(r'_\{([^{}]+)\}', lambda m: sub_str(m.group(1)), text)
    text = re.sub(r'_(\d)', lambda m: m.group(1).translate(SUB_DIGITS), text)
    text = re.sub(r'_([nmkpq])', lambda m: SUB_LETTERS.get(m.group(1), m.group(1)), text)

    # ellipsis variants
    for pat in [r'\\cdot\\cdot\\cdot', r'\\cdots', r'\\ldots', r'\\dots']:
        text = re.sub(pat, '...', text)

    # common operators & symbols
    subs = [
        (r'\\times',  '×'),
        (r'\\div',    '÷'),
        (r'\\pm',     '±'),
        (r'\\mp',     '∓'),
        (r'\\neq',    '≠'),
        (r'\\ne\b',   '≠'),
        (r'\\leq',    '≤'),
        (r'\\geq',    '≥'),
        (r'\\le\b',   '≤'),
        (r'\\ge\b',   '≥'),
        (r'\\infty',  '∞'),
        (r'\\alpha',  'α'),
        (r'\\beta',   'β'),
        (r'\\theta',  'θ'),
        (r'\\pi',     'π'),
        (r'\\left',   ''),
        (r'\\right',  ''),
    ]
    for pat, rep in subs:
        text = re.sub(pat, rep, text)

    # strip remaining $ signs
    text = text.replace('$', '')

    # strip remaining \word sequences (unknown commands)
    text = re.sub(r'\\[a-zA-Z]+', '', text)

    # strip stray braces
    text = text.replace('{', '').replace('}', '')

    # collapse multiple spaces
    text = re.sub(r' {2,}', ' ', text).strip()

    return text

# ── Main ─────────────────────────────────────────────────────────────────────
qs = QuestionBank.objects.filter(chapter__in=DIRTY_CHAPTERS).order_by('chapter', 'id')
changed = []

for q in qs:
    if '$' not in q.question_text and '\\' not in q.question_text:
        continue
    original = q.question_text
    cleaned  = clean_latex(original)
    if cleaned != original:
        changed.append((q, original, cleaned))

print(f"Questions needing cleanup: {len(changed)}\n")

if not APPLY:
    print("=" * 80)
    for q, before, after in changed:
        print(f"id={q.id} [{q.chapter}]")
        print(f"  BEFORE: {before[:140]}")
        print(f"  AFTER:  {after[:140]}")
        print()
    print(f"\n(dry-run — pass --apply to commit changes)")
else:
    by_chapter = {}
    for q, _, cleaned in changed:
        q.question_text = cleaned
        q.save(update_fields=['question_text'])
        by_chapter[q.chapter] = by_chapter.get(q.chapter, 0) + 1
    print(f"✓ Applied: {sum(by_chapter.values())} questions updated")
    for ch, n in sorted(by_chapter.items()):
        print(f"  {ch}: {n}")
