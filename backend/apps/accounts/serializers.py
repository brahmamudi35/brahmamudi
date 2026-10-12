from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from . import otp, tokens
from .emails import (
    send_password_reset_email,
    send_verification_email,
    send_verification_email_safely,
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    has_profile = serializers.SerializerMethodField()
    google_linked = serializers.SerializerMethodField()
    has_usable_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "phone", "full_name", "is_staff", "is_superuser",
            "email_verified", "email_digest", "must_reset_password", "date_joined",
            "has_profile", "google_linked", "has_usable_password",
        )
        read_only_fields = fields

    def get_google_linked(self, obj) -> bool:
        return bool(obj.google_sub)

    def get_has_usable_password(self, obj) -> bool:
        return obj.has_usable_password()

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
        send_verification_email_safely(user)
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


class _CodeOrTokenMixin:
    """Shared ``validate`` helper: an emailed OTP (``email`` + ``code``) is the
    primary path; the old signed-link fields still work for in-flight emails."""

    def _user_from_code(self, attrs, purpose):
        email = (attrs.get("email") or "").lower()
        if not email:
            request = self.context.get("request")
            if request is not None and request.user.is_authenticated:
                email = request.user.email
        if not email:
            raise serializers.ValidationError({"email": "Enter your email address."})
        user = User.objects.filter(email=email, is_active=True).first()
        try:
            otp.check(user, purpose, attrs["code"])
        except otp.OTPError as exc:
            raise serializers.ValidationError({"code": str(exc)}) from None
        return user


class PasswordResetConfirmSerializer(_CodeOrTokenMixin, serializers.Serializer):
    email = serializers.EmailField(required=False)
    code = serializers.CharField(required=False, max_length=12)
    uid = serializers.CharField(required=False)
    token = serializers.CharField(required=False)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate(self, attrs):
        if attrs.get("code"):
            attrs["user"] = self._user_from_code(attrs, otp.Purpose.PASSWORD_RESET)
            return attrs
        user = None
        if attrs.get("uid") and attrs.get("token"):
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


class EmailVerifySerializer(_CodeOrTokenMixin, serializers.Serializer):
    email = serializers.EmailField(required=False)
    code = serializers.CharField(required=False, max_length=12)
    token = serializers.CharField(required=False)

    def validate(self, attrs):
        if attrs.get("code"):
            attrs["user"] = self._user_from_code(attrs, otp.Purpose.VERIFY_EMAIL)
            return attrs
        user = tokens.read_email_token(attrs["token"]) if attrs.get("token") else None
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


class DeleteAccountSerializer(serializers.Serializer):
    """Confirm with the current password, or — for accounts that never set one
    (Google sign-in, unreset legacy members) — by typing DELETE."""

    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    confirm = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context["request"].user
        if user.is_staff or user.is_superuser:
            raise serializers.ValidationError(
                "Staff accounts can't be deleted here. Ask a super admin."
            )
        if user.has_usable_password():
            if not user.check_password(attrs.get("password") or ""):
                raise serializers.ValidationError({"password": "Password is incorrect."})
        elif (attrs.get("confirm") or "").strip().upper() != "DELETE":
            raise serializers.ValidationError({"confirm": "Type DELETE to confirm."})
        return attrs

    def save(self, **kwargs):
        from .services import delete_account

        delete_account(self.context["request"].user)


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self, **kwargs):
        user = User.objects.filter(
            email=self.validated_data["email"].lower(), is_active=True, email_verified=False
        ).first()
        if user is not None:
            send_verification_email(user)
