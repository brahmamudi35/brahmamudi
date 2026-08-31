from rest_framework import status

from apps.interests.models import Interest
from apps.messaging.models import Conversation
from apps.reference.enums import Gender
from apps.testing import ApiTestCase, give_subscription, make_profile


def accept_interest(sender, receiver):
    Interest.objects.create(
        sender=sender, receiver=receiver, status=Interest.Status.ACCEPTED
    )


class ConversationStartTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.gold = make_profile(gender=Gender.MALE)
        give_subscription(self.gold, "gold")  # can_chat = True
        self.her = make_profile(gender=Gender.FEMALE)

    def _open(self, as_profile, other):
        self.client.force_authenticate(as_profile.user)
        return self.client.post("/api/v1/conversations/", {"profile": other.pk},
                                format="json")

    def test_cannot_start_without_accepted_interest(self):
        resp = self._open(self.gold, self.her)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(resp.data["code"], "no_accepted_interest")

    def test_cannot_start_without_chat_plan(self):
        free = make_profile(gender=Gender.MALE)
        accept_interest(free, self.her)
        resp = self._open(free, self.her)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(resp.data["code"], "plan_required")

    def test_gold_member_with_accepted_interest_can_start(self):
        accept_interest(self.gold, self.her)
        resp = self._open(self.gold, self.her)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Conversation.objects.count(), 1)

        # idempotent + order-independent: the other side "opening" reuses it
        again = self._open(self.her, self.gold)
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertEqual(Conversation.objects.count(), 1)


class MessageExchangeTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.a = make_profile(gender=Gender.MALE)
        give_subscription(self.a, "platinum")
        self.b = make_profile(gender=Gender.FEMALE)
        accept_interest(self.a, self.b)
        self.client.force_authenticate(self.a.user)
        self.convo = Conversation.objects.get(
            pk=self.client.post("/api/v1/conversations/", {"profile": self.b.pk},
                                format="json").data["id"]
        )

    def test_send_receive_and_read_receipts(self):
        r = self.client.post(f"/api/v1/conversations/{self.convo.pk}/messages/",
                             {"body": "  Namaste  "}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(r.data["body"], "Namaste")

        # b sees one unread, then reading clears it
        self.client.force_authenticate(self.b.user)
        convos = self.client.get("/api/v1/conversations/")
        self.assertEqual(convos.data["results"][0]["unread"], 1)

        thread = self.client.get(f"/api/v1/conversations/{self.convo.pk}/messages/")
        self.assertEqual(len(thread.data["results"]), 1)
        unread = self.client.get("/api/v1/conversations/unread-count/")
        self.assertEqual(unread.data["unread"], 0)

    def test_empty_message_rejected(self):
        r = self.client.post(f"/api/v1/conversations/{self.convo.pk}/messages/",
                             {"body": "   "}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_outsider_cannot_read_thread(self):
        outsider = make_profile(gender=Gender.MALE)
        self.client.force_authenticate(outsider.user)
        r = self.client.get(f"/api/v1/conversations/{self.convo.pk}/messages/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_free_member_can_reply_once_thread_exists(self):
        self.client.post(f"/api/v1/conversations/{self.convo.pk}/messages/",
                         {"body": "hi"}, format="json")
        self.client.force_authenticate(self.b.user)  # b has no chat plan
        r = self.client.post(f"/api/v1/conversations/{self.convo.pk}/messages/",
                             {"body": "hello back"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
