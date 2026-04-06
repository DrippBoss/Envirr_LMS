from django.db import models
from courses.models import Unit, UnitPrerequisite
from activity.models import UnitCompletion, StudentEnrollment

def check_enrollment_access(student, course) -> bool:
    """Verify strictly if a user possesses the rights to consume course contents."""
    if student.role in ['admin', 'teacher']:
        return True
    return StudentEnrollment.objects.filter(student=student, course=course).exists()

def can_unlock_unit(student, unit: Unit) -> bool:
    """Core Duolingo-style interlocking algorithm to parse Unit prerequisite states."""
    
    prereqs = UnitPrerequisite.objects.filter(unit=unit).values_list('required_unit_id', flat=True)
    if not prereqs:
        return True

    completed_prereqs = UnitCompletion.objects.filter(
        student=student, 
        unit_id__in=prereqs
    ).count()
    
    # Must explicitly match the count to guarantee 100% prerequisite clearance.
    return completed_prereqs == len(prereqs)
