from rest_framework import mixins, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from . import enums
from .models import EducationLevel, Nakshatram, Raasi
from .serializers import (
    EducationLevelSerializer,
    NakshatramSerializer,
    RaasiSerializer,
)


def _choices(choice_cls):
    return [{"value": v, "label": l} for v, l in choice_cls.choices]


class EnumsView(APIView):
    """All fixed-choice vocabularies in one call, for building forms."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "gender": _choices(enums.Gender),
            "marital_status": _choices(enums.MaritalStatus),
            "food_habit": _choices(enums.FoodHabit),
            "complexion": _choices(enums.Complexion),
            "subcaste": _choices(enums.SubCaste),
            "region": _choices(enums.Region),
            "profile_for": _choices(enums.ProfileFor),
            "profile_status": _choices(enums.ProfileStatus),
            "paadam": [{"value": n, "label": str(n)} for n in (1, 2, 3, 4)],
        })


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
