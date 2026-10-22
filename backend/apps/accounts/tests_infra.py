from django.test import TestCase

from apps.testing import make_user


class InfraEndpointTests(TestCase):
    def test_healthz_ok(self):
        resp = self.client.get("/healthz")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["checks"]["database"], "ok")

    def test_openapi_schema_and_docs_are_staff_only(self):
        paths = ("/api/schema/", "/api/docs/", "/api/redoc/")
        for path in paths:
            self.assertIn(self.client.get(path).status_code, (401, 403), path)
        self.client.force_login(make_user(is_staff=True))
        for path in paths:
            self.assertEqual(self.client.get(path).status_code, 200, path)
