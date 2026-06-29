import os
import re
from pathlib import Path
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False)
)
environ.Env.read_env(BASE_DIR / '.env', overwrite=True)

SECRET_KEY = env('SECRET_KEY', default='django-insecure-replace-me')
DEBUG = env('DEBUG')

if not DEBUG and SECRET_KEY.startswith('django-insecure'):
    raise RuntimeError(
        "SECURITY: SECRET_KEY is still the insecure default. "
        "Set a strong random SECRET_KEY in your production environment."
    )
GEMINI_API_KEY = env('GEMINI_API_KEY', default='')
GROQ_API_KEY   = env('GROQ_API_KEY',   default='')

# Wide-open only in DEBUG; production must declare its hosts via ALLOWED_HOSTS
# (comma-separated). Fail closed — an unset value in prod allows nothing.
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=(['*'] if DEBUG else []))


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',

    # Local Domain Apps
    'users.apps.UsersConfig',
    # 'courses.apps.CoursesConfig',   # legacy — superseded by learning.CourseUnit
    # 'activity.apps.ActivityConfig', # legacy — superseded by learning.NodeProgress
    'gamification.apps.GamificationConfig',
    'ai_engine.apps.AiEngineConfig',
    'learning.apps.LearningConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'users.middleware.IPBanMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'envirr_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'envirr_backend.wsgi.application'

DATABASES = {
    'default': env.db('DATABASE_URL', default=f'sqlite:///{BASE_DIR}/db.sqlite3')
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = (
    'whitenoise.storage.CompressedManifestStaticFilesStorage' if not DEBUG
    else 'django.contrib.staticfiles.storage.StaticFilesStorage'
)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# ── Deployment: serve the built React SPA same-origin ───────────────────────
# In production we build frontend/dist and let WhiteNoise serve it at the site
# root (assets like /assets/*.js); a catch-all in urls.py returns index.html for
# client-side routes. Same-origin keeps the httpOnly auth cookie simple (no CORS).
_SPA_DIST = BASE_DIR / 'frontend' / 'dist'
if _SPA_DIST.exists():
    WHITENOISE_ROOT = str(_SPA_DIST)
    WHITENOISE_INDEX_FILE = True

# Testing/staging conveniences (env-driven; default off = normal prod behaviour):
#  - AUTO_VERIFY_USERS: register without email verification (closed friends test)
#  - CELERY_TASK_ALWAYS_EAGER: run tasks inline (no separate worker on free tiers)
AUTO_VERIFY_USERS = env.bool('AUTO_VERIFY_USERS', default=False)
CELERY_TASK_ALWAYS_EAGER = env.bool('CELERY_TASK_ALWAYS_EAGER', default=False)
CELERY_TASK_EAGER_PROPAGATES = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Configuration
AUTH_USER_MODEL = 'users.CustomUser'

# Django Rest Framework & SimpleJWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        # An SPA fires several API calls per page, so the global ceilings must be
        # generous; abuse-prone endpoints (login, recovery, ai_tutor) keep their
        # own tight scoped throttles below. (The previous 20/day anon · 500/day
        # user broke normal use — /me/ alone, called on every load, exhausted it.)
        'anon': '120/hour',
        'user': '4000/hour',
        'ai_tutor': '30/hour',
        'login': '10/hour',
        'account_recovery': '5/hour',
    },
    'EXCEPTION_HANDLER': 'envirr_backend.exceptions.envirr_exception_handler',
}

# Password-reset link validity (used by django's default_token_generator).
PASSWORD_RESET_TIMEOUT = 60 * 60 * 2  # 2 hours

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),   # tightened from 8h; refresh token keeps session alive
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_REFRESH': 'refresh_token',
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_SECURE': not DEBUG,
    'AUTH_COOKIE_SAMESITE': 'Lax',
}

# Celery Configuration
CELERY_BROKER_URL = env('REDIS_URL', default='redis://localhost:6379/1')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TASK_SERIALIZER = 'json'

# Cache — Redis (separate db from the Celery broker to avoid key collisions).
# Defaults to db 2 on the same host derived from REDIS_URL; LocMemCache fallback
# keeps tests/local runs working if Redis is unreachable.
CACHE_URL = env('CACHE_URL', default=re.sub(r'/\d+$', '/2', CELERY_BROKER_URL))
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': CACHE_URL,
        'KEY_PREFIX': 'envirr',
    }
}
# Email — SMTP when credentials are set, console fallback otherwise
EMAIL_HOST          = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT          = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS       = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER     = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = env('DEFAULT_FROM_EMAIL', default='Envirr <noreply@envirr.app>')
FRONTEND_URL        = env('FRONTEND_URL', default='http://localhost:5173')
EMAIL_BACKEND = (
    'django.core.mail.backends.smtp.EmailBackend' if EMAIL_HOST_USER
    else 'django.core.mail.backends.console.EmailBackend'
)

# CORS — open in dev, allowlist-restricted in production
CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=['http://localhost:5173'])
CORS_ALLOW_CREDENTIALS = True

# AI Tutor runs on Gemini (cloud). Paper generation / ingestion use Groq.
# Choose the tutor model (e.g., gemini-2.0-flash); aliases are mapped in AiTutorView.
GEMINI_TUTOR_MODEL = env('GEMINI_TUTOR_MODEL', default='gemini-2.0-flash')

# Cookie security — enforce HTTPS in production
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# Production-only security headers
if not DEBUG:
    # Env-overridable so a prod-config image can still be smoke-tested over http
    # locally (set SECURE_SSL_REDIRECT=False); real deploys keep it on.
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS = 31_536_000          # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# Warn loudly at startup if email is not configured in production.
if not DEBUG and not EMAIL_HOST_USER:
    import warnings
    warnings.warn(
        "EMAIL_HOST_USER is not set: email verification and password reset "
        "will silently fail in production. Set EMAIL_HOST_USER and "
        "EMAIL_HOST_PASSWORD in your production .env.",
        RuntimeWarning,
        stacklevel=2,
    )

# Security logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'security': {
            'format': '[{asctime}] {levelname} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'security',
        },
    },
    'loggers': {
        'django.security': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'envirr.security': {
            'handlers': ['console'],
            'level': 'INFO',   # INFO: permission grants; WARNING: failures/bans; ERROR: lockouts
            'propagate': False,
        },
    },
}
