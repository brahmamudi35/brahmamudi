from django.contrib.admin.apps import AdminConfig


class BrahmamudiAdminConfig(AdminConfig):
    """Swaps in the superuser-only, branded admin site."""

    default_site = "config.admin.BrahmamudiAdminSite"

    def ready(self):
        super().ready()
        from config.admin import register_audit_log, wire_action_logging

        wire_action_logging()
        register_audit_log()
