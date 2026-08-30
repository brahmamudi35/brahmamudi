import django_filters as filters

from apps.reference import enums

from .models import Profile


class ProfileFilter(filters.FilterSet):
    gender = filters.ChoiceFilter(choices=enums.Gender.choices)
    subcaste = filters.MultipleChoiceFilter(choices=enums.SubCaste.choices)
    marital_status = filters.MultipleChoiceFilter(choices=enums.MaritalStatus.choices)
    region = filters.MultipleChoiceFilter(choices=enums.Region.choices)
    food_habit = filters.MultipleChoiceFilter(choices=enums.FoodHabit.choices)

    age_min = filters.NumberFilter(method="filter_age_min")
    age_max = filters.NumberFilter(method="filter_age_max")
    height_min = filters.NumberFilter(field_name="height_cm", lookup_expr="gte")
    height_max = filters.NumberFilter(field_name="height_cm", lookup_expr="lte")

    nakshatram = filters.NumberFilter(field_name="nakshatram__order")
    raasi = filters.NumberFilter(field_name="raasi__order")
    gothram = filters.CharFilter(lookup_expr="icontains")
    country_living = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Profile
        fields = ["gender", "subcaste", "marital_status", "region", "food_habit"]

    @staticmethod
    def _dob_bound(age):
        from datetime import date

        today = date.today()
        try:
            return today.replace(year=today.year - int(age))
        except ValueError:  # Feb 29
            return today.replace(year=today.year - int(age), day=28)

    def filter_age_min(self, queryset, name, value):
        return queryset.filter(date_of_birth__lte=self._dob_bound(value))

    def filter_age_max(self, queryset, name, value):
        # someone at most `value` years old was born after this date
        return queryset.filter(date_of_birth__gte=self._dob_bound(value + 1))
