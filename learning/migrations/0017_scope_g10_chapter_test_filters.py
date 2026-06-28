from django.db import migrations

# Map a Grade-10 unit title to the QuestionBank `chapter` its chapter test
# should pull from. Only Grade-10 units with a matching question pool are listed;
# Grade-9 units are intentionally omitted (the bank holds Class-10 chapter content,
# so scoping them would feed wrong-grade questions), and "Circles" has no chapter
# in the bank at all. Those remain a content gap to be filled separately.
TITLE_TO_CHAPTER = {
    "Number Systems": "Real Numbers",
    "Polynomials": "Polynomials",
    "Quadratic": "Quadratic Equations",
    "Quadratic Equations": "Quadratic Equations",
    "Pair of Linear Equations in Two Variables": "Pair of Linear Equations in Two Variables",
    "Arithmetic Progressions": "Arithmetic Progressions",
    "Chapter 6: Triangles": "Chapter 6: Triangles",
}


def scope_filters(apps, schema_editor):
    """Set question_filter on Grade-10 chapter-test nodes that currently have an
    empty filter, so the test draws from its chapter instead of the whole bank."""
    LearningNode = apps.get_model("learning", "LearningNode")
    for node in LearningNode.objects.filter(node_type="CHAPTER_TEST"):
        if node.question_filter:  # only fill empties; never overwrite a real filter
            continue
        path = getattr(node, "path", None)
        unit = getattr(path, "unit", None) if path else None
        if not unit or unit.class_grade != "10":
            continue
        chapter = TITLE_TO_CHAPTER.get(unit.title)
        if not chapter:
            continue
        node.question_filter = {"subject": unit.subject or "Mathematics", "chapter": chapter}
        node.save(update_fields=["question_filter"])


def noop(apps, schema_editor):
    # Irreversible by design: we don't restore empty (broken) filters on reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("learning", "0016_alter_studygroup_max_members"),
    ]

    operations = [
        migrations.RunPython(scope_filters, noop),
    ]
