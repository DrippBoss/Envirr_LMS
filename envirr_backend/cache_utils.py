"""Redis cache helpers using a version-token invalidation scheme.

Django's built-in RedisCache has no ``delete_pattern``, so instead of trying to
enumerate every cache key we mix a per-scope *version token* into the key. To
invalidate, we simply write a new token: all keys built from the old token
become unreachable and expire on their own TTL. This avoids serving stale data
without needing pattern deletes.
"""
import uuid
from django.core.cache import cache

DASHBOARD_TTL = 120        # seconds
QBANK_META_TTL = 300       # seconds


def _versioned_token(key):
    token = cache.get(key)
    if token is None:
        token = uuid.uuid4().hex
        cache.set(key, token, None)  # token itself never expires
    return token


def dashboard_version(student_id):
    return _versioned_token(f"dash_ver:{student_id}")


def bust_dashboard(student_id):
    cache.set(f"dash_ver:{student_id}", uuid.uuid4().hex, None)


def qbank_meta_version():
    return _versioned_token("qbmeta_ver")


def bust_qbank_meta():
    cache.set("qbmeta_ver", uuid.uuid4().hex, None)
