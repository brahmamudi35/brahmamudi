from rest_framework import mixins, permissions, viewsets

from .models import EducationLevel, Nakshatram, Raasi
from .serializers import (
    EducationLevelSerializer,
    NakshatramSerializer,
    RaasiSerializer,
)


class ReadOnlyPublic(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class NakshatramViewSet(ReadOnlyPublic):
    queryset = Nakshatram.objects.all()
    serializer_class = NakshatramSerializer


class RaasiViewSet(ReadOnlyPublic):
    queryset = Raasi.objects.all()
    serializer_class = RaasiSerializer


class EducationLevelViewSet(ReadOnlyPublic):
    queryset = EducationLevel.objects.all()
    serializer_class = EducationLevelSerializer
