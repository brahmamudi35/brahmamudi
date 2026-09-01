"""The weekly digest email. Plain text, matching the other transactional mails."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from .tokens import make_unsubscribe_token

logger = logging.getLogger(__name__)


def _fe(path: str) -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}{path}"


def _unsubscribe_url(user) -> str:
    base = settings.BACKEND_BASE_URL.rstrip("/")
    return f"{base}/api/v1/digests/unsubscribe/?token={make_unsubscribe_token(user)}"


def _match_line(item) -> str:
    p = item["profile"]
    bits = [p.first_name or p.regno]
    if p.age:
        bits.append(f"{p.age} yrs")
    if p.subcaste:
        bits.append(p.get_subcaste_display())
    if p.settled_at:
        bits.append(p.settled_at)
    line = ", ".join(bits)
    return f"- {line}  ({item['score']}% match) -> {_fe(f'/profiles/{p.pk}')}"


def render_digest(profile, digest: dict) -> tuple[str, str]:
    name = profile.first_name or "there"
    parts: list[str] = [f"Namaste {name},", ""]

    matches = digest["matches"]
    if matches:
        parts.append(f"New matches for you ({len(matches)}):")
        parts += [_match_line(m) for m in matches]
        parts.append("")

    if digest["pending_interest_count"]:
        n = digest["pending_interest_count"]
        parts.append(
            f"{n} interest{'s' if n != 1 else ''} waiting for your response:"
        )
        parts += [
            f"- {i.sender.first_name or i.sender.regno} ({i.sender.regno})"
            for i in digest["pending_interests"]
        ]
        parts.append(f"Respond: {_fe('/interests')}")
        parts.append("")

    if digest["visitor_count"]:
        n = digest["visitor_count"]
        parts.append(f"{n} member{'s' if n != 1 else ''} viewed your profile this week:")
        parts += [
            f"- {v.viewer.first_name or v.viewer.regno}"
            for v in digest["visitors"]
        ]
        parts.append(f"See all visitors: {_fe('/visitors')}")
        parts.append("")

    parts += [
        "— brahmamudi",
        "",
        f"Don't want these weekly updates? Unsubscribe: {_unsubscribe_url(profile.user)}",
    ]

    if matches:
        subject = (
            f"{len(matches)} new match{'es' if len(matches) != 1 else ''} "
            "and your weekly activity"
        )
    elif digest["pending_interest_count"]:
        n = digest["pending_interest_count"]
        subject = f"{n} interest{'s' if n != 1 else ''} awaiting your reply"
    else:
        subject = "Your weekly brahmamudi activity"
    return subject, "\n".join(parts)


def send_digest_email(profile, digest: dict) -> bool:
    to = (getattr(profile.user, "email", "") or "").strip()
    if not to:
        return False
    subject, body = render_digest(profile, digest)
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
            fail_silently=False,
        )
        return True
    except Exception:  # noqa: BLE001 - digests must never crash the batch
        logger.exception("failed to send digest email to %s", to)
        return False
