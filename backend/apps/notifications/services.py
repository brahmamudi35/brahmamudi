"""Create in-app notifications. Best-effort: a failure here never breaks the
action that triggered it."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone

from .models import Notification

logger = logging.getLogger(__name__)


def notify(recipient, kind: str, *, text: str, url: str = "",
           actor=None, data: dict | None = None,
           dedupe_hours: int | None = None) -> Notification | None:
    if recipient is None or (actor is not None and actor.pk == recipient.pk):
        return None
    try:
        if dedupe_hours:
            since = timezone.now() - timedelta(hours=dedupe_hours)
            existing = Notification.objects.filter(
                recipient=recipient, kind=kind, created_at__gte=since,
            )
            if actor is not None:
                existing = existing.filter(actor=actor)
            hit = existing.first()
            if hit:
                hit.text = text
                hit.url = url or hit.url
                hit.data = data or hit.data
                hit.read_at = None
                hit.created_at = timezone.now()
                hit.save(update_fields=["text", "url", "data", "read_at", "created_at"])
                return hit
        return Notification.objects.create(
            recipient=recipient, kind=kind, actor=actor,
            text=text, url=url, data=data or {},
        )
    except Exception:  # noqa: BLE001
        logger.exception("failed to create notification %s for %s", kind, recipient)
        return None


def unread_count(profile) -> int:
    return Notification.objects.filter(recipient=profile, read_at__isnull=True).count()


def mark_read(profile, ids: list[int] | None = None) -> int:
    qs = Notification.objects.filter(recipient=profile, read_at__isnull=True)
    if ids is not None:
        qs = qs.filter(id__in=ids)
    return qs.update(read_at=timezone.now())
