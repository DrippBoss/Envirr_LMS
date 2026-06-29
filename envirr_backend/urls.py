import os
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, HttpResponse
from django.views.static import serve as static_serve
from learning.views import MetadataView


def spa_index(request, *args, **kwargs):
    """Serve the built SPA's index.html for any non-API client route."""
    index = os.path.join(str(settings.BASE_DIR), 'frontend', 'dist', 'index.html')
    if os.path.exists(index):
        return FileResponse(open(index, 'rb'))
    return HttpResponse(
        "Frontend not built. Run `npm run build` (or use the prod image).", status=501)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/metadata/', MetadataView.as_view()),
    path('api/auth/', include('users.urls')),
    # courses and activity apps are legacy (superseded by learning/).
    # Their URL registrations are removed; DB tables are retained.
    path('api/gamification/', include('gamification.urls')),
    path('api/ai/', include('ai_engine.urls')),
    path('api/student/', include('learning.urls')),
    path('api/teacher/', include('learning.teacher_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Prod: serve user-uploaded media (low-traffic test) + the SPA for all other
    # paths. These go last so /api/ and /admin/ resolve first.
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', static_serve, {'document_root': settings.MEDIA_ROOT}),
        re_path(r'^(?!api/|admin/|media/|static/).*$', spa_index),
    ]
