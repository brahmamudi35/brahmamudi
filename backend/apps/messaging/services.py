"""Rules for who may start a conversation.

A thread can be opened when the two profiles have an **accepted** interest
between them AND the opener holds a plan whose ``can_chat`` is on (Gold /
Platinum). Once the thread exists either side may post - a free member can
always reply to a paying one.
"""

from __future__ import annotations

from django.db import IntegrityError, models
from django.utils import timezone

from apps.interests.models import Interest
from apps.memberships.models import Subscription

from .models import Conversation, Message


class ChatNotAllowed(Exception):
    def __init__(self, detail: str, code: str = "chat_not_allowed"):
        self.detail, self.code = detail, code
        super().__init__(detail)


def can_chat(profile) -> bool:
    return any(
        s.plan.can_chat
        for s in profile.subscriptions.select_related("plan")
        .filter(status=Subscription.Status.ACTIVE)
        if s.is_current
    )


def _has_accepted_interest(a, b) -> bool:
    return Interest.objects.filter(
        status=Interest.Status.ACCEPTED
    ).filter(
        models.Q(sender=a, receiver=b) | models.Q(sender=b, receiver=a)
    ).exists()


def get_or_create_conversation(opener, other) -> Conversation:
    if opener.pk == other.pk:
        raise ChatNotAllowed("You cannot message yourself.", "self")

    lo, hi = sorted((opener, other), key=lambda p: p.pk)
    existing = Conversation.objects.filter(profile_a=lo, profile_b=hi).first()
    if existing:
        return existing

    if not _has_accepted_interest(opener, other):
        raise ChatNotAllowed(
            "You can message a member after they accept your interest.",
            "no_accepted_interest",
        )
    if not can_chat(opener):
        raise ChatNotAllowed(
            "Upgrade to a plan with messaging to start a conversation.",
            "plan_required",
        )
    try:
        return Conversation.objects.create(profile_a=lo, profile_b=hi)
    except IntegrityError:  # concurrent open of the same pair
        return Conversation.objects.get(profile_a=lo, profile_b=hi)


def post_message(conversation: Conversation, sender, body: str) -> Message:
    body = (body or "").strip()
    if not body:
        raise ChatNotAllowed("Message cannot be empty.", "empty")
    msg = Message.objects.create(conversation=conversation, sender=sender, body=body)
    Conversation.objects.filter(pk=conversation.pk).update(last_message_at=msg.created_at)
    return msg


def mark_read(conversation: Conversation, reader) -> int:
    return conversation.messages.filter(read_at__isnull=True).exclude(
        sender=reader
    ).update(read_at=timezone.now())


def unread_count(profile) -> int:
    return Message.objects.filter(
        conversation__in=Conversation.objects.filter(
            models.Q(profile_a=profile) | models.Q(profile_b=profile)
        ),
        read_at__isnull=True,
    ).exclude(sender=profile).count()
