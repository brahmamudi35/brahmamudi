from django.urls import path

from .views import PayUInitiateView, PayUWebhookView

urlpatterns = [
    path("payments/payu/initiate/", PayUInitiateView.as_view(), name="payu-initiate"),
    path("payments/payu/webhook/", PayUWebhookView.as_view(), name="payu-webhook"),
]
