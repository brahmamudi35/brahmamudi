from rest_framework import serializers

from apps.profiles.models import Profile, ProfilePhoto


class ModerationProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    age = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    photo_count = serializers.IntegerField(read_only=True)
    pending_photo_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Profile
        fields = (
            "id", "regno", "full_name", "email", "gender", "age", "subcaste",
            "occupation", "country_living", "status", "is_verified",
            "photo_count", "pending_photo_count", "created_at",
        )


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
