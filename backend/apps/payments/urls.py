from django.urls import path

from .views import PayUInitiateView, PayUReturnView, PayUWebhookView

urlpatterns = [
    path("payments/payu/initiate/", PayUInitiateView.as_view(), name="payu-initiate"),
    path("payments/payu/return/", PayUReturnView.as_view(), name="payu-return"),
    path("payments/payu/webhook/", PayUWebhookView.as_view(), name="payu-webhook"),
]
