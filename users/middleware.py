from django.http import JsonResponse


def _get_client_ip(request) -> str:
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


class IPBanMiddleware:
    """Block requests from IPs stored in the BannedIP table."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Lazy import avoids app-registry issues during startup
        from users.models import BannedIP

        ip = _get_client_ip(request)
        if ip and BannedIP.objects.filter(ip_address=ip).exists():
            return JsonResponse(
                {
                    'error': 'access_blocked',
                    'message': 'Your access has been permanently blocked. '
                               'Contact support if you believe this is a mistake.',
                },
                status=403,
            )

        return self.get_response(request)
