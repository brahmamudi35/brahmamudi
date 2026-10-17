from django.contrib.auth import get_user_model
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.memberships.models import Subscription
from apps.payments.models import PaymentTransaction
from apps.profiles.models import HoroscopeDocument, PartnerPreference, Profile, ProfilePhoto

from .models import StaffAction


def _active_plan_name(profile) -> str:
    sub = next(
        (s for s in profile.subscriptions.all()
         if s.status == "active" and s.is_current), None
    )
    return sub.plan.name if sub else "Free"


class ModerationProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    age = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    photo_count = serializers.IntegerField(read_only=True)
    pending_photo_count = serializers.IntegerField(read_only=True)
    plan = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            "id", "regno", "full_name", "email", "phone", "gender", "age",
            "subcaste", "region", "marital_status", "occupation", "designation",
            "work_location", "education_detail", "country_living", "status",
            "is_verified", "plan", "photo_count", "pending_photo_count",
            "created_at",
        )

    def get_plan(self, obj) -> str:
        return _active_plan_name(obj)


# --- member detail panel -------------------------------------------------

class ModerationSubscriptionSerializer(serializers.ModelSerializer):
    plan = serializers.CharField(source="plan.name", read_only=True)
    plan_slug = serializers.CharField(source="plan.slug", read_only=True)
    is_current = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id", "plan", "plan_slug", "status", "started_on", "expires_on",
            "is_current", "is_legacy", "payment_id", "created_at",
        )


class ModerationPaymentSerializer(serializers.ModelSerializer):
    profile_id = serializers.IntegerField(source="profile.id", read_only=True)
    regno = serializers.CharField(source="profile.regno", read_only=True)
    profile_name = serializers.CharField(source="profile.full_name", read_only=True)
    plan = serializers.CharField(source="plan.name", read_only=True, default=None)

    class Meta:
        model = PaymentTransaction
        fields = (
            "id", "txnid", "mihpayid", "profile_id", "regno", "profile_name",
            "plan", "amount", "status", "environment", "mode", "bank_ref_num",
            "email", "phone", "error_message", "is_legacy", "created_at",
            "completed_at",
        )


class StaffActionSerializer(serializers.ModelSerializer):
    profile_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = StaffAction
        fields = ("id", "actor_email", "action", "profile_id", "profile_regno",
                  "data", "created_at")


class _PartnerPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerPreference
        exclude = ("profile", "legacy_raw")


class ModerationProfileDetailSerializer(ModerationProfileSerializer):
    email_verified = serializers.BooleanField(source="user.email_verified", read_only=True)
    last_login = serializers.DateTimeField(source="user.last_login", read_only=True)
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)
    photos = serializers.SerializerMethodField()
    horoscope = serializers.SerializerMethodField()
    subscriptions = ModerationSubscriptionSerializer(many=True, read_only=True)
    partner_preference = _PartnerPreferenceSerializer(read_only=True)
    completeness = serializers.SerializerMethodField()
    activity = serializers.SerializerMethodField()

    class Meta(ModerationProfileSerializer.Meta):
        fields = ModerationProfileSerializer.Meta.fields + (
            "first_name", "date_of_birth",
            "surname", "mother_tongue", "height_cm", "complexion", "food_habit",
            "physically_challenged", "gothram", "education", "education_detail", "company",
            "annual_income_text", "native_district", "address",
            "father_name", "father_occupation", "mother_name", "mother_occupation",
            "family_background", "about", "expectations", "willing_to_relocate_abroad",
            "contact_phone", "parent_phone", "contact_notes",
            "email_verified", "last_login", "date_joined", "photos", "horoscope",
            "subscriptions", "partner_preference", "completeness", "activity",
        )

    def _abs(self, url):
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_photos(self, obj):
        return [
            {"id": p.id, "image": self._abs(p.image.url), "is_primary": p.is_primary,
             "is_approved": p.is_approved, "uploaded_at": p.uploaded_at}
            for p in obj.photos.all()
        ]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_horoscope(self, obj):
        doc = getattr(obj, "horoscope", None)
        if doc is None:
            return None
        return {"id": doc.id, "file": self._abs(doc.file.url), "is_pdf": doc.is_pdf,
                "is_approved": doc.is_approved, "original_name": doc.original_name}

    def get_completeness(self, obj) -> int:
        from apps.profiles.services import completeness

        return completeness(obj)["percent"]

    def get_activity(self, obj) -> dict:
        return {
            "interests_sent": obj.sent_interests.count(),
            "interests_received": obj.received_interests.count(),
            "profile_views_received": obj.views_received.count(),
            "shortlisted_by": obj.shortlisted_by.count(),
            "contacts_unlocked": obj.contact_unlocks_made.count(),
        }


# --- member profile edit ----------------------------------------------

class _UserFieldsSerializer(serializers.ModelSerializer):
    # Plain field, not derived from the model: avoids DRF auto-attaching a
    # UniqueValidator here, which (as a nested child serializer with no
    # instance of its own) can't exclude the profile's own user and would
    # reject saving back its current, unchanged email. Uniqueness for a
    # genuinely new email is checked explicitly in update() below.
    email = serializers.EmailField(required=False)

    class Meta:
        model = get_user_model()
        fields = ("email", "phone", "full_name", "email_verified")
        extra_kwargs = {f: {"required": False} for f in fields}


class ModerationProfileWriteSerializer(serializers.ModelSerializer):
    """Staff editing a member's bio-data on their behalf. Status and the verified
    badge are left to the dedicated actions."""

    user = _UserFieldsSerializer(required=False)

    class Meta:
        model = Profile
        fields = (
            "user",
            "first_name", "surname", "gender", "date_of_birth", "marital_status",
            "mother_tongue", "height_cm", "complexion", "food_habit",
            "physically_challenged", "subcaste", "gothram", "education", "education_detail",
            "occupation", "company", "work_location", "designation",
            "annual_income_text", "country_living", "native_district", "region",
            "address", "father_name", "father_occupation", "mother_name",
            "mother_occupation", "family_background", "about", "expectations",
            "willing_to_relocate_abroad", "contact_phone", "parent_phone",
            "contact_notes",
        )

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        if user_data:
            new_email = user_data.get("email")
            if new_email and new_email.lower() != instance.user.email:
                new_email = new_email.lower()
                if get_user_model().objects.filter(email=new_email).exclude(
                    pk=instance.user_id
                ).exists():
                    raise serializers.ValidationError(
                        {"user": {"email": "Another account already uses this email."}}
                    )
                user_data["email"] = new_email
            for k, v in user_data.items():
                setattr(instance.user, k, v)
            instance.user.save()
        return super().update(instance, validated_data)


class ModerationPhotoSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(read_only=True)
    profile_id = serializers.IntegerField(source="profile.id", read_only=True)
    regno = serializers.CharField(source="profile.regno", read_only=True)
    profile_name = serializers.CharField(source="profile.full_name", read_only=True)

    class Meta:
        model = ProfilePhoto
        fields = (
            "id", "image", "is_primary", "is_approved", "uploaded_at",
            "profile_id", "regno", "profile_name",
        )


class ModerationHoroscopeSerializer(serializers.ModelSerializer):
    file = serializers.FileField(read_only=True)
    profile_id = serializers.IntegerField(source="profile.id", read_only=True)
    regno = serializers.CharField(source="profile.regno", read_only=True)
    profile_name = serializers.CharField(source="profile.full_name", read_only=True)

    class Meta:
        model = HoroscopeDocument
        fields = (
            "id", "file", "original_name", "is_pdf", "is_approved", "uploaded_at",
            "profile_id", "regno", "profile_name",
        )
