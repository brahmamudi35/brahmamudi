from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from . import tokens
from .emails import send_password_reset_email, send_verification_email

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    has_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "phone", "full_name", "is_staff", "email_verified",
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

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        send_verification_email(user)
        return user


class LoginSerializer(TokenObtainPairSerializer):
    """JWT login that also returns the user payload and reset flag."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.has_usable_password() or not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.must_reset_password = False
        user.save(update_fields=["password", "must_reset_password"])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self, **kwargs):
        user = User.objects.filter(email=self.validated_data["email"].lower(), is_active=True).first()
        if user is not None:
            send_password_reset_email(user)
        # never reveal whether the address exists


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate(self, attrs):
        user = tokens.read_password_reset_token(attrs["uid"], attrs["token"])
        if user is None:
            raise serializers.ValidationError("This reset link is invalid or has expired.")
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.must_reset_password = False
        # a successful reset also proves control of the inbox
        user.email_verified = True
        user.save(update_fields=["password", "must_reset_password", "email_verified"])
        return user


class EmailVerifySerializer(serializers.Serializer):
    token = serializers.CharField()

    def validate(self, attrs):
        user = tokens.read_email_token(attrs["token"])
        if user is None:
            raise serializers.ValidationError("This verification link is invalid or has expired.")
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=["email_verified"])
        return user


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self, **kwargs):
        user = User.objects.filter(
            email=self.validated_data["email"].lower(), is_active=True, email_verified=False
        ).first()
        if user is not None:
            send_verification_email(user)
