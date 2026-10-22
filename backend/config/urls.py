import re

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as serve_static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import TokenRefreshView

from config.health import healthz

from apps.accounts.views import (
    DeleteAccountView,
    EmailVerifyView,
    GoogleAuthView,
    LoginView,
    MeView,
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    ResendVerificationView,
)

api_v1 = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/google/", GoogleAuthView.as_view(), name="google-auth"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/delete-account/", DeleteAccountView.as_view(), name="delete-account"),
    path("auth/password/change/", PasswordChangeView.as_view(), name="password-change"),
    path("auth/password/reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("auth/password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("auth/email/verify/", EmailVerifyView.as_view(), name="email-verify"),
    path("auth/email/verify/resend/", ResendVerificationView.as_view(), name="email-verify-resend"),
    path("", include("apps.profiles.urls")),
    path("", include("apps.memberships.urls")),
    path("", include("apps.payments.urls")),
    path("", include("apps.interests.urls")),
    path("", include("apps.reference.urls")),
    path("", include("apps.moderation.urls")),
    path("", include("apps.notifications.urls")),
    path("", include("apps.alerts.urls")),
    path("", include("apps.digests.urls")),
]

urlpatterns = [
    path("healthz", healthz, name="healthz"),
    path(settings.DJANGO_ADMIN_PATH, admin.site.urls),
    path("api/v1/", include((api_v1, "api"), namespace="v1")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# When uploads live on local disk there's no separate file server in front of
# this app, so serve MEDIA_URL directly in every environment, same as whitenoise
# stands in for nginx on static files. (django.conf.urls.static.static() no-ops
# when DEBUG=False, so build the pattern directly instead.) With R2, file URLs
# point at the bucket and this route isn't needed.
if settings.MEDIA_ON_DISK:
    urlpatterns += [
        re_path(
            r"^%s(?P<path>.*)$" % re.escape(settings.MEDIA_URL.lstrip("/")),
            serve_static,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
