"""Staff sending one member's profile to a hand-picked list of other members,
or a hand-picked list of profiles to one member.

Each suggestion is an in-app notification linking to the profile, plus an
email when the recipient has a real email address. Members can only open active
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
MAX_SUGGESTIONS = 10  # profiles sent to one member in one go
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


def _resolve(member: Profile, numbers: list[str]) -> ShareResult:
    """Look up the typed numbers against ``member``: matches that pass the
    skip rules land in ``sent`` (not yet notified)."""
    result = ShareResult()
    seen_ids = set()
    for number in numbers:
        other = find_profile(number)
        if other is None:
            result.not_found.append(number)
            continue
        if other.pk in seen_ids:
            continue
        seen_ids.add(other.pk)
        reason = _skip_reason(member, other)
        if reason:
            result.skipped.append((number, other, reason))
            continue
        result.sent.append(other)
    return result


def _notify_suggestion(recipient: Profile, profile: Profile) -> None:
    notify(
        recipient, "profile_shared", actor=profile,
        text=f"brahmamudi suggests {profile.first_name or 'a profile'} ({profile.regno}) for you",
        url=f"/profiles/{profile.pk}", data={"by_staff": True},
    )


def share_profile(profile: Profile, numbers: list[str]) -> ShareResult:
    """Send ``profile`` to each member whose number is listed."""
    result = _resolve(profile, numbers)
    for recipient in result.sent:
        _notify_suggestion(recipient, profile)
    if result.sent:
        recipients = list(result.sent)
        transaction.on_commit(lambda: in_background(_email_all, profile, recipients))
    return result


def suggest_profiles(member: Profile, numbers: list[str]) -> ShareResult:
    """Send each listed profile to ``member``: one notification per profile
    and a single email listing them all."""
    result = _resolve(member, numbers)
    for profile in result.sent:
        _notify_suggestion(member, profile)
    if result.sent:
        profiles = list(result.sent)
        transaction.on_commit(lambda: in_background(_email_suggestions, member, profiles))
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


def _email_address(member: Profile) -> str:
    """The member's real email, or "" for none / a placeholder address."""
    to = (member.user.email or "").strip()
    return "" if to.endswith("@brahmamudi.invalid") else to


def _profile_link(profile: Profile) -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/profiles/{profile.pk}"


def _email_suggestions(member: Profile, profiles: list[Profile]) -> None:
    """Runs after the request: one email to ``member`` listing every profile."""
    to = _email_address(member)
    if not to:
        return
    lines = "\n".join(
        f"- {p.first_name or 'A member'} ({p.regno}): {_profile_link(p)}" for p in profiles
    )
    try:
        send_mail(
            subject=f"{len(profiles)} profile{'s' if len(profiles) > 1 else ''} suggested for you",
            message=(
                f"Namaste {member.first_name or 'there'},\n\n"
                f"The brahmamudi team thinks these profiles could be a good match for "
                f"you. Sign in to view them:\n\n{lines}\n\n"
                f"— brahmamudi"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
            fail_silently=False,
        )
    except Exception:  # noqa: BLE001 - the notifications are already saved
        logger.exception("failed to email suggested profiles to %s", member.regno)


def _email_all(profile: Profile, recipients: list[Profile]) -> None:
    """Runs after the request: one email per recipient, failures only logged."""
    link = _profile_link(profile)
    name = profile.first_name or "A member"
    for r in recipients:
        to = _email_address(r)
        if not to:
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
