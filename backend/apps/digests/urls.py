from django.urls import path

from .views import DigestUnsubscribeView

urlpatterns = [
    path("digests/unsubscribe/", DigestUnsubscribeView.as_view(), name="digest-unsubscribe"),
]
