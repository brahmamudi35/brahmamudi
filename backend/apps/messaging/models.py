from django.db import models


class Conversation(models.Model):
    """A 1:1 thread between two profiles.

    Participants are stored lowest-pk-first (``profile_a`` < ``profile_b``) so a
    pair has exactly one conversation regardless of who opened it.
    """

    profile_a = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, related_name="conversations_a"
    )
    profile_b = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, related_name="conversations_b"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = "conversation"
        ordering = ["-last_message_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["profile_a", "profile_b"], name="uniq_conversation_pair"
            ),
            models.CheckConstraint(
                condition=models.Q(profile_a__lt=models.F("profile_b")),
                name="conversation_ordered_participants",
            ),
        ]

    def __str__(self):
        return f"conversation<{self.profile_a_id},{self.profile_b_id}>"

    def other(self, profile):
        return self.profile_b if profile.pk == self.profile_a_id else self.profile_a

    def has_participant(self, profile) -> bool:
        return profile.pk in (self.profile_a_id, self.profile_b_id)


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, related_name="messages_sent"
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "message"
        ordering = ["created_at"]
        indexes = [models.Index(fields=["conversation", "created_at"])]

    def __str__(self):
        return f"message<{self.conversation_id}> from {self.sender_id}"
