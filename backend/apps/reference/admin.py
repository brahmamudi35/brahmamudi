from django.contrib import admin

from .models import EducationLevel, Nakshatram, Raasi


@admin.register(Nakshatram)
class NakshatramAdmin(admin.ModelAdmin):
    list_display = ("order", "name", "lord", "gana", "nadi")
    search_fields = ("name", "aliases")
    ordering = ("order",)


@admin.register(Raasi)
class RaasiAdmin(admin.ModelAdmin):
    list_display = ("order", "name", "english_name", "lord")
    search_fields = ("name", "english_name", "aliases")
    ordering = ("order",)


@admin.register(EducationLevel)
class EducationLevelAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "legacy_code", "sort_order")
    list_filter = ("category",)
    search_fields = ("name",)
