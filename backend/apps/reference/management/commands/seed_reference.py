from django.core.management.base import BaseCommand
from django.db import transaction

from apps.interests.models import InterestTemplate
from apps.memberships.models import MembershipPlan
from apps.reference import data
from apps.reference.models import EducationLevel, Nakshatram, Raasi


class Command(BaseCommand):
    help = "Idempotently load reference data (nakshatram, raasi, education, plans, interest templates)."

    @transaction.atomic
    def handle(self, *args, **options):
        for order, name, aliases, lord, gana, yoni, nadi in data.NAKSHATRAM:
            Nakshatram.objects.update_or_create(
                order=order,
                defaults=dict(name=name, aliases=aliases, lord=lord, gana=gana, yoni=yoni, nadi=nadi),
            )
        self.stdout.write(f"Nakshatram: {Nakshatram.objects.count()}")

        for order, name, aliases, lord, english in data.RAASI:
            Raasi.objects.update_or_create(
                order=order,
                defaults=dict(name=name, aliases=aliases, lord=lord, english_name=english),
            )
        self.stdout.write(f"Raasi: {Raasi.objects.count()}")

        for name, category, legacy_code, sort_order in data.EDUCATION_LEVELS:
            EducationLevel.objects.update_or_create(
                legacy_code=legacy_code,
                defaults=dict(name=name, category=category, sort_order=sort_order),
            )
        self.stdout.write(f"EducationLevel: {EducationLevel.objects.count()}")

        for name, slug, months, price, views, per_day, can_chat, sort_order in data.MEMBERSHIP_PLANS:
            MembershipPlan.objects.update_or_create(
                slug=slug,
                defaults=dict(
                    name=name,
                    legacy_id=[k for k, v in data.LEGACY_PLAN_MAP.items() if v == slug][0],
                    duration_months=months,
                    price_inr=price,
                    contact_views=views,
                    interests_per_day=per_day,
                    can_chat=can_chat,
                    can_view_photos=True,
                    sort_order=sort_order,
                    is_active=True,
                ),
            )
        self.stdout.write(f"MembershipPlan: {MembershipPlan.objects.count()}")

        for msgcatid, text in data.INTEREST_TEMPLATES:
            InterestTemplate.objects.update_or_create(
                legacy_msgcatid=msgcatid,
                defaults=dict(text=text, sort_order=msgcatid, is_active=True),
            )
        self.stdout.write(f"InterestTemplate: {InterestTemplate.objects.count()}")

        self.stdout.write(self.style.SUCCESS("Reference data seeded."))
