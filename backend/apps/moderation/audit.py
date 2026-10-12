"""Record staff actions to the audit trail (``StaffAction``) and the log."""

from __future__ import annotations

import logging

from .models import StaffAction

log = logging.getLogger("apps.admin")


def record(user, action: str, profile=None, **data) -> StaffAction:
    entry = StaffAction.objects.create(
        actor=user if getattr(user, "pk", None) else None,
        actor_email=getattr(user, "email", "") or "",
        action=action,
        profile=profile,
        profile_regno=getattr(profile, "regno", "") or "",
        data=data,
    )
    log.info("staff action %s by %s on %s %s", action, entry.actor_email,
             entry.profile_regno or "-", data or "")
    return entry
