"""Staff sending one member's profile to a hand-picked list of other members.

Each recipient gets an in-app notification linking to the profile and, when
they have a real email address, an email. Members can only open active
profiles of the opposite gender, so anyone else is skipped with a reason.
"""

from __future__ import annotations

import logging
import re
import threading
from dataclasses import dataclass, field

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

from apps.notifications.services import notify
from apps.profiles.models import Profile
from apps.reference.enums import ProfileStatus

logger = logging.getLogger(__name__)

MAX_RECIPIENTS = 100
_SPLIT = re.compile(r"[\s,;]+")
_LEADING_NUMBER = re.compile(r"^(\d+)")


def parse_numbers(raw) -> list[str]:
    """Profile numbers typed by staff, split on commas, spaces or new lines,
    in order and without repeats."""
    if isinstance(raw, list):
        raw = " ".join(str(x) for x in raw)
    seen, out = set(), []
    for token in _SPLIT.split(str(raw or "")):
        key = token.strip().upper()
        if key and key not in seen:
            seen.add(key)
            out.append(token.strip())
    return out


def find_profile(number: str) -> Profile | None:
    """By profile number, or for an old-site member by the number their
    profile number starts with (6185 finds "6185-17 CA-S-VIP (R)")."""
    p = Profile.objects.select_related("user").filter(regno__iexact=number).first()
    if p:
        return p
    m = _LEADING_NUMBER.match(number)
    if m:
        return Profile.objects.select_related("user").filter(legacy_rid=int(m.group(1))).first()
    return None


@dataclass
class ShareResult:
    sent: list[Profile] = field(default_factory=list)
    not_found: list[str] = field(default_factory=list)
    skipped: list[tuple[str, Profile, str]] = field(default_factory=list)

    def as_dict(self) -> dict:
        def brief(p):
            return {"id": p.pk, "regno": p.regno, "name": p.full_name}
        return {
            "sent": [brief(p) for p in self.sent],
            "not_found": self.not_found,
            "skipped": [{"number": n, **brief(p), "reason": r} for n, p, r in self.skipped],
        }


def share_profile(profile: Profile, numbers: list[str]) -> ShareResult:
    result = ShareResult()
    seen_ids = set()
    for number in numbers:
        recipient = find_profile(number)
        if recipient is None:
            result.not_found.append(number)
            continue
        if recipient.pk in seen_ids:
            continue
        seen_ids.add(recipient.pk)
        reason = _skip_reason(profile, recipient)
        if reason:
            result.skipped.append((number, recipient, reason))
            continue
        notify(
            recipient, "profile_shared", actor=profile,
            text=f"brahmamudi suggests {profile.first_name or 'a profile'} ({profile.regno}) for you",
            url=f"/profiles/{profile.pk}", data={"by_staff": True},
        )
        result.sent.append(recipient)
    if result.sent:
        recipients = list(result.sent)
        transaction.on_commit(lambda: in_background(_email_all, profile, recipients))
    return result


def in_background(fn, *args) -> None:
    """Emails go out after the response so a long list can't time it out."""
    threading.Thread(target=fn, args=args, daemon=True).start()


def _skip_reason(profile: Profile, recipient: Profile) -> str:
    if recipient.pk == profile.pk:
        return "this is the same profile"
    if recipient.gender == profile.gender:
        return "same gender"
    if recipient.status != ProfileStatus.ACTIVE:
        return f"account is {recipient.get_status_display().lower()}"
    return ""


def _email_all(profile: Profile, recipients: list[Profile]) -> None:
    """Runs after the request: one email per recipient, failures only logged."""
    link = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/profiles/{profile.pk}"
    name = profile.first_name or "A member"
    for r in recipients:
        to = (r.user.email or "").strip()
        if not to or to.endswith("@brahmamudi.invalid"):
            continue
        try:
            send_mail(
                subject=f"A profile suggested for you: {name} ({profile.regno})",
                message=(
                    f"Namaste {r.first_name or 'there'},\n\n"
                    f"The brahmamudi team thinks {name} ({profile.regno}) could be a good "
                    f"match for you. Sign in to view the profile:\n{link}\n\n"
                    f"— brahmamudi"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to],
                fail_silently=False,
            )
        except Exception:  # noqa: BLE001 - one bad address must not stop the rest
            logger.exception("failed to email shared profile %s to %s", profile.regno, r.regno)
