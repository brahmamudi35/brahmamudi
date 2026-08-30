from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import LoginView, MeView, RegisterView

api_v1 = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("", include("apps.profiles.urls")),
    path("", include("apps.memberships.urls")),
    path("", include("apps.payments.urls")),
    path("", include("apps.interests.urls")),
    path("", include("apps.reference.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include((api_v1, "api"), namespace="v1")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
