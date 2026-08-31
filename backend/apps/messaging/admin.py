from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("sender", "body", "created_at", "read_at")
    can_delete = False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "profile_a", "profile_b", "last_message_at", "created_at")
    search_fields = ("profile_a__regno", "profile_b__regno")
    autocomplete_fields = ("profile_a", "profile_b")
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at", "read_at")
    search_fields = ("body", "sender__regno")
    date_hierarchy = "created_at"
