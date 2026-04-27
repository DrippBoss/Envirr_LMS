from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


class CookieJWTAuthentication(JWTAuthentication):
    """
    JWT authentication that reads the access token from an httpOnly cookie
    instead of the Authorization header.
    """

    def authenticate(self, request):
        # Try cookie first
        token = request.COOKIES.get('access_token')

        # Fall back to Authorization header for non-browser clients / tests
        if not token:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]

        if not token:
            return None

        try:
            validated_token = self.get_validated_token(token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except (InvalidToken, AuthenticationFailed):
            return None
