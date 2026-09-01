"""The Django admin, locked down as a superuser-only control room.

Staff (``is_staff``) run the day-to-day member desk from the frontend ``/admin``
page (the ``apps.moderation`` API). The Django admin here is for superusers
only: full model access, and the place schema-level changes are made.

Hardening applied:
  * ``has_permission`` requires ``is_superuser`` (not just ``is_staff``)
  * the URL prefix is configurable via ``DJANGO_ADMIN_PATH`` (see config.urls)
  * failed logins are rate-limited per IP via the cache
  * logins, failed logins and every admin action are written to the ``apps``
    logger (structured JSON in production)
"""

from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.admin import AdminSite
from django.core.cache import cache

log = logging.getLogger("apps.admin")

_LOCKOUT_LIMIT = getattr(settings, "ADMIN_LOGIN_MAX_ATTEMPTS", 8)
_LOCKOUT_WINDOW = getattr(settings, "ADMIN_LOGIN_LOCKOUT_SECONDS", 15 * 60)


def _client_ip(request) -> str:
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class BrahmamudiAdminSite(AdminSite):
    site_header = "Brahmamudi super admin"
    site_title = "Brahmamudi super admin"
    index_title = "Control room"

    def has_permission(self, request):
        user = request.user
        return bool(user.is_active and user.is_superuser)

    def login(self, request, extra_context=None):
        ip = _client_ip(request)
        key = f"admin-login-fail:{ip}"

        if request.method == "POST" and cache.get(key, 0) >= _LOCKOUT_LIMIT:
            log.warning("admin login blocked (rate limit)", extra={"ip": ip})
            from django.http import HttpResponse

            return HttpResponse(
                "Too many failed sign-in attempts. Try again later.", status=429
            )

        response = super().login(request, extra_context)

        # A successful login redirects (302); a failed POST re-renders the form (200).
        if request.method == "POST":
            if request.user.is_authenticated:
                cache.delete(key)
                log.info(
                    "admin login", extra={"ip": ip, "user": request.user.email}
                )
            else:
                attempts = cache.get(key, 0) + 1
                cache.set(key, attempts, _LOCKOUT_WINDOW)
                log.warning(
                    "admin login failed",
                    extra={"ip": ip, "attempts": attempts,
                           "email": request.POST.get("username", "")},
                )
        return response


def _log_admin_action(sender, instance, created, **kwargs):
    """Mirror every LogEntry the admin writes into the app log."""
    actions = {1: "add", 2: "change", 3: "delete"}
    log.info(
        "admin action",
        extra={
            "user": getattr(instance.user, "email", instance.user_id),
            "action": actions.get(instance.action_flag, str(instance.action_flag)),
            "model": instance.content_type and instance.content_type.model,
            "object_id": instance.object_id,
            "repr": instance.object_repr,
            "change": instance.change_message,
        },
    )


def wire_action_logging():
    from django.contrib.admin.models import LogEntry
    from django.db.models.signals import post_save

    post_save.connect(
        _log_admin_action, sender=LogEntry, dispatch_uid="brahmamudi-admin-audit"
    )


def register_audit_log():
    """Expose the admin's own action history, read-only."""
    from django.contrib import admin
    from django.contrib.admin.models import LogEntry

    if LogEntry in admin.site._registry:
        return

    @admin.register(LogEntry, site=admin.site)
    class LogEntryAdmin(admin.ModelAdmin):
        list_display = ("action_time", "user", "content_type", "object_repr",
                        "action_flag", "change_message")
        list_filter = ("action_flag", "content_type")
        search_fields = ("object_repr", "change_message", "user__email")
        date_hierarchy = "action_time"

        def has_add_permission(self, request):
            return False

        def has_change_permission(self, request, obj=None):
            return False

        def has_delete_permission(self, request, obj=None):
            return False
