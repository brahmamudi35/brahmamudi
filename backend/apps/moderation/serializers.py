from rest_framework import serializers

from apps.profiles.models import HoroscopeDocument, Profile, ProfilePhoto


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
        sub = next(
            (s for s in obj.subscriptions.all()
             if s.status == "active" and s.is_current), None
        )
        return sub.plan.name if sub else "Free"


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
