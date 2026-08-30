from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    has_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "phone", "full_name", "is_staff",
            "must_reset_password", "date_joined", "has_profile",
        )
        read_only_fields = fields

    def get_has_profile(self, obj) -> bool:
        return hasattr(obj, "profile")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ("id", "email", "phone", "full_name", "password")

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(TokenObtainPairSerializer):
    """JWT login that also returns the user payload and reset flag."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
