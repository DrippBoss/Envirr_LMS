import math
from rest_framework.views import exception_handler
from rest_framework.exceptions import Throttled
from rest_framework.response import Response


def _human_wait(seconds: int) -> str:
    """Convert seconds into the most readable unit."""
    if seconds < 60:
        return f"{seconds} second{'s' if seconds != 1 else ''}"
    if seconds < 3600:
        mins = math.ceil(seconds / 60)
        return f"{mins} minute{'s' if mins != 1 else ''}"
    hours = math.ceil(seconds / 3600)
    return f"{hours} hour{'s' if hours != 1 else ''}"


# Maps throttle scope → friendly message template (use {wait} as placeholder)
_THROTTLE_MESSAGES = {
    'login':    "Too many login attempts. Please wait {wait} before trying again.",
    'ai_tutor': "You've reached the AI Tutor limit for this hour. Try again in {wait}.",
    'user':     "You've made too many requests today. Your limit resets in {wait}.",
    'anon':     "Too many requests. Please log in or wait {wait} to continue.",
}
_DEFAULT_THROTTLE_MESSAGE = "Too many requests. Please wait {wait} and try again."


def envirr_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if isinstance(exc, Throttled):
        wait = math.ceil(exc.wait) if exc.wait else 60
        human_wait = _human_wait(wait)

        # Identify the scope from the throttle class that fired
        scope = getattr(getattr(exc, 'throttle', None), 'scope', None)
        template = _THROTTLE_MESSAGES.get(scope, _DEFAULT_THROTTLE_MESSAGE)

        response = Response(
            {
                'error': 'rate_limit_exceeded',
                'message': template.format(wait=human_wait),
                'retry_after_seconds': wait,
            },
            status=429,
        )

    return response
