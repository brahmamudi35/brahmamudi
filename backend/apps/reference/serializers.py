from rest_framework import serializers

from .models import EducationLevel, Nakshatram, Raasi


class NakshatramSerializer(serializers.ModelSerializer):
    class Meta:
        model = Nakshatram
        fields = ("id", "order", "name", "aliases", "lord", "gana", "yoni", "nadi")


class RaasiSerializer(serializers.ModelSerializer):
    class Meta:
        model = Raasi
        fields = ("id", "order", "name", "aliases", "lord", "english_name")


class EducationLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationLevel
        fields = ("id", "name", "category", "sort_order")
