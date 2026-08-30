from rest_framework import serializers

from .models import PartnerPreference, Profile, ProfilePhoto


class ProfilePhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilePhoto
        fields = ("id", "image", "is_primary", "is_approved", "uploaded_at")
        read_only_fields = ("is_approved", "uploaded_at")


class PartnerPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartnerPreference
        exclude = ("profile", "legacy_raw")


# Contact fields visible only to the owner or eligible members.
CONTACT_FIELDS = ("contact_phone", "parent_phone", "contact_notes", "address")


class ProfileListSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    city_display = serializers.CharField(source="settled_at", read_only=True)
    primary_photo = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = (
            "id", "regno", "full_name", "first_name", "gender", "age",
            "height_cm", "marital_status", "subcaste", "gothram",
            "education_detail", "occupation", "work_location",
            "region", "country_living", "city_display", "primary_photo",
            "is_verified",
        )

    def get_primary_photo(self, obj):
        if not obj.photos_visible:
            return None
        photo = next((p for p in obj.photos.all() if p.is_primary and p.is_approved), None)
        photo = photo or next((p for p in obj.photos.all() if p.is_approved), None)
        if not photo:
            return None
        request = self.context.get("request")
        url = photo.image.url
        return request.build_absolute_uri(url) if request else url


class ProfileDetailSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    photos = ProfilePhotoSerializer(many=True, read_only=True)
    partner_preference = PartnerPreferenceSerializer(read_only=True)
    nakshatram_name = serializers.CharField(source="nakshatram.name", read_only=True)
    raasi_name = serializers.CharField(source="raasi.name", read_only=True)

    class Meta:
        model = Profile
        exclude = ("user", "legacy_raw", "legacy_rid")
        read_only_fields = (
            "regno", "status", "is_verified", "registered_on", "expires_on",
            "created_at", "updated_at",
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._can_see_contact(instance):
            for field in CONTACT_FIELDS:
                data.pop(field, None)
            data["contact_locked"] = True
        return data

    def _can_see_contact(self, instance):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        viewer = getattr(request.user, "profile", None)
        if viewer and viewer.pk == instance.pk:
            return True
        # TODO: gate on an active paid subscription + contact-view quota
        return False
