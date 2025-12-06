import os
import time
import unittest
import uuid

import requests

BASE_URL = (os.getenv("IWAS_BASE_URL") or "http://localhost:5050").rstrip("/")
JWT_TOKEN = os.getenv("IWAS_JWT")
SLACK_WEBHOOK = os.getenv("IWAS_SLACK_WEBHOOK")
GH_TOKEN = os.getenv("IWAS_GH_TOKEN")
GH_REPO = os.getenv("IWAS_GH_REPO")  # owner/name


def auth_headers():
  if not JWT_TOKEN:
    return {}
  return {"Authorization": f"Bearer {JWT_TOKEN}"}


def api_url(path: str) -> str:
  path = path if path.startswith("/") else f"/{path}"
  return f"{BASE_URL}{path}"


class E2EIntegrations(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    if not JWT_TOKEN:
      raise unittest.SkipTest("IWAS_JWT not set; skipping integration E2E tests.")

  def test_notifications_recent_feed(self):
    """Ensure recent notifications endpoint responds for the current user."""
    resp = requests.get(api_url("/api/notifications/recent"), headers=auth_headers(), timeout=15)
    self.assertEqual(resp.status_code, 200, resp.text)
    body = resp.json()
    self.assertTrue(body.get("ok"))
    self.assertIn("items", body)

  def test_slack_webhook_roundtrip(self):
    """Configure Slack webhook (if provided) then send a test alert."""
    if not SLACK_WEBHOOK:
      self.skipTest("IWAS_SLACK_WEBHOOK not set; skipping Slack test.")

    resp = requests.post(
      api_url("/api/integrations/slack"),
      headers={**auth_headers(), "Content-Type": "application/json"},
      json={"webhook_url": SLACK_WEBHOOK},
      timeout=15,
    )
    self.assertEqual(resp.status_code, 200, resp.text)
    self.assertTrue(resp.json().get("ok"))

    resp = requests.post(api_url("/api/integrations/slack/test"), headers=auth_headers(), timeout=15)
    self.assertEqual(resp.status_code, 200, resp.text)
    self.assertTrue(resp.json().get("ok"))

  def test_github_issue_flow(self):
    """Save GitHub token, verify identity, and create a test issue."""
    if not (GH_TOKEN and GH_REPO):
      self.skipTest("IWAS_GH_TOKEN and/or IWAS_GH_REPO not set; skipping GitHub test.")

    resp = requests.post(
      api_url("/api/integrations/github"),
      headers={**auth_headers(), "Content-Type": "application/json"},
      json={"token": GH_TOKEN, "default_repo": GH_REPO},
      timeout=20,
    )
    self.assertIn(resp.status_code, (200, 201), resp.text)
    self.assertTrue(resp.json().get("ok"))

    resp = requests.post(api_url("/api/integrations/github/test"), headers=auth_headers(), timeout=20)
    self.assertEqual(resp.status_code, 200, resp.text)
    self.assertTrue(resp.json().get("ok"))

    owner, repo = GH_REPO.split("/", 1)
    title = f"iwas-e2e-{int(time.time())}-{uuid.uuid4().hex[:6]}"
    resp = requests.post(
      api_url(f"/api/integrations/github/repos/{owner}/{repo}/issues"),
      headers={**auth_headers(), "Content-Type": "application/json"},
      json={"title": title, "description": "Automated E2E issue from IWAS test suite."},
      timeout=30,
    )
    self.assertEqual(resp.status_code, 201, resp.text)
    body = resp.json()
    self.assertTrue(body.get("ok"))
    self.assertIn("issue", body)

  def test_integration_config_presence(self):
    """Config endpoint should respond and list configured integration shells."""
    resp = requests.get(api_url("/api/integrations/config"), headers=auth_headers(), timeout=15)
    self.assertEqual(resp.status_code, 200, resp.text)
    body = resp.json()
    self.assertTrue(body.get("ok"))
    self.assertIn("items", body)


if __name__ == "__main__":
  unittest.main()
