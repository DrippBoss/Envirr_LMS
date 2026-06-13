from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from learning.views import MetadataView


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
