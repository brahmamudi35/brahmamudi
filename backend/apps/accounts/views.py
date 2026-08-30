from rest_framework import generics, permissions, response, status, views
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    EmailVerifySerializer,
    LoginSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        user = request.user
        for field in ("phone", "full_name"):
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        return response.Response(UserSerializer(user).data)


class _ActionView(views.APIView):
    """POST a serializer that does its work in .save(); return 200 {detail}."""

    permission_classes = [permissions.AllowAny]
    serializer_class = None
    success_detail = "OK"

    def post(self, request):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response({"detail": self.success_detail})


class PasswordResetRequestView(_ActionView):
    serializer_class = PasswordResetRequestSerializer
    success_detail = "If that email is registered, a reset link is on its way."


class PasswordResetConfirmView(_ActionView):
    serializer_class = PasswordResetConfirmSerializer
    success_detail = "Password updated. You can now sign in."


class PasswordChangeView(_ActionView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PasswordChangeSerializer
    success_detail = "Password changed."


class EmailVerifyView(_ActionView):
    serializer_class = EmailVerifySerializer
    success_detail = "Email verified."


class ResendVerificationView(_ActionView):
    serializer_class = ResendVerificationSerializer
    success_detail = "If that email needs verifying, a new link is on its way."
