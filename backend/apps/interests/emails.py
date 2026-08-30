"""Transactional emails for interest activity.

Notifications are best-effort: a mail-backend failure is logged but never
propagates, so responding to / sending an interest still succeeds.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _interests_link() -> str:
    return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/interests"


def _recipient_email(profile) -> str:
    user = getattr(profile, "user", None)
    email = getattr(user, "email", "") or ""
    return email.strip()


def _send(subject: str, body: str, to: str) -> None:
    if not to:
        return
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to],
            fail_silently=False,
        )
    except Exception:  # noqa: BLE001 - notifications must not break the request
        logger.exception("Failed to send interest email to %s", to)


def _interest_text(interest) -> str:
    if interest.message:
        return interest.message
    if interest.template_id and interest.template:
        return interest.template.text
    return ""


def notify_interest_received(interest) -> None:
    to = _recipient_email(interest.receiver)
    sender_name = interest.sender.first_name or "A member"
    note = _interest_text(interest)
    quote = f'\n"{note}"\n' if note else ""
    _send(
        subject=f"{sender_name} expressed interest in your profile",
        body=(
            f"Namaste {interest.receiver.first_name or 'there'},\n\n"
            f"{sender_name} ({interest.sender.regno}) has expressed interest in "
            f"your brahmamudi profile.\n{quote}\n"
            f"Sign in to view their profile and accept or decline:\n{_interests_link()}\n\n"
            f"— brahmamudi"
        ),
        to=to,
    )


def notify_interest_response(interest) -> None:
    """Tell the sender their interest was accepted or declined."""
    to = _recipient_email(interest.sender)
    receiver_name = interest.receiver.first_name or "The member"
    if interest.status == interest.Status.ACCEPTED:
        subject = f"{receiver_name} accepted your interest"
        line = (
            f"Good news — {receiver_name} ({interest.receiver.regno}) has accepted "
            f"your interest. You can now take the conversation forward."
        )
    elif interest.status == interest.Status.DECLINED:
        subject = "Update on your expressed interest"
        line = (
            f"{receiver_name} has reviewed your interest and is not taking it "
            f"forward at this time. Do keep exploring other matches."
        )
    else:
        return
    _send(
        subject=subject,
        body=(
            f"Namaste {interest.sender.first_name or 'there'},\n\n"
            f"{line}\n\n"
            f"See all your interests here:\n{_interests_link()}\n\n"
            f"— brahmamudi"
        ),
        to=to,
    )
