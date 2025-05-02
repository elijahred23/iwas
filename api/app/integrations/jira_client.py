import requests
from requests.auth import HTTPBasicAuth
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import logging

class JiraClientException(Exception):
    pass

class JiraClient:
    def __init__(self, base_url: str, email: str, api_token: str):
        self.base_url = base_url.rstrip('/')
        self.auth = HTTPBasicAuth(email, api_token)
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        # Setup session with retry
        self.session = requests.Session()
        retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
        self.session.mount("https://", HTTPAdapter(max_retries=retries))
    def test_auth(self):
        url = f"{self.base_url}/rest/api/3/myself"
        response = self.session.get(url, headers=self.headers, auth=self.auth)
        return self._handle_response(response)


    def _handle_response(self, response):
        if not response.ok:
            logging.error(f"JIRA API error: {response.status_code} - {response.text}")
            raise JiraClientException(f"Error {response.status_code}: {response.text}")
        return response.json()

    def create_issue(self, project_key, summary, description, issue_type="Task", custom_fields=None):
        url = f"{self.base_url}/rest/api/3/issue"
        fields = {
            "project": {"key": project_key},
            "summary": summary,
            "description": description,
            "issuetype": {"name": issue_type}
        }
        if custom_fields:
            fields.update(custom_fields)

        response = self.session.post(url, json={"fields": fields}, headers=self.headers, auth=self.auth)
        return self._handle_response(response)

    def get_issue(self, issue_key):
        url = f"{self.base_url}/rest/api/3/issue/{issue_key}"
        response = self.session.get(url, headers=self.headers, auth=self.auth)
        return self._handle_response(response)

    def update_issue(self, issue_key, updates):
        url = f"{self.base_url}/rest/api/3/issue/{issue_key}"
        response = self.session.put(url, json={"fields": updates}, headers=self.headers, auth=self.auth)
        return self._handle_response(response)

    def transition_issue(self, issue_key, transition_id):
        url = f"{self.base_url}/rest/api/3/issue/{issue_key}/transitions"
        payload = {"transition": {"id": str(transition_id)}}
        response = self.session.post(url, json=payload, headers=self.headers, auth=self.auth)
        return self._handle_response(response)

    def get_transitions(self, issue_key):
        url = f"{self.base_url}/rest/api/3/issue/{issue_key}/transitions"
        response = self.session.get(url, headers=self.headers, auth=self.auth)
        return self._handle_response(response)

    def add_comment(self, issue_key, comment):
        url = f"{self.base_url}/rest/api/3/issue/{issue_key}/comment"
        response = self.session.post(url, json={"body": comment}, headers=self.headers, auth=self.auth)
        return self._handle_response(response)

    def add_attachment(self, issue_key, file_path):
        url = f"{self.base_url}/rest/api/3/issue/{issue_key}/attachments"
        headers = self.headers.copy()
        headers["X-Atlassian-Token"] = "no-check"

        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = self.session.post(url, headers=headers, files=files, auth=self.auth)
            return self._handle_response(response)

    def search_issues(self, jql, max_results=50, start_at=0):
        url = f"{self.base_url}/rest/api/3/search"
        all_issues = []
        while True:
            params = {
                "jql": jql,
                "maxResults": max_results,
                "startAt": start_at
            }
            response = self.session.get(url, headers=self.headers, auth=self.auth, params=params)
            data = self._handle_response(response)
            issues = data.get("issues", [])
            all_issues.extend(issues)

            if start_at + max_results >= data.get("total", 0):
                break
            start_at += max_results
        return all_issues

    def log_work(self, issue_key, time_spent, comment=None):
        url = f"{self.base_url}/rest/api/3/issue/{issue_key}/worklog"
        payload = {
            "timeSpent": time_spent,
            "comment": comment or "Logged via IWAS"
        }
        response = self.session.post(url, json=payload, headers=self.headers, auth=self.auth)
        return self._handle_response(response)

    def get_project_metadata(self, project_key):
        url = f"{self.base_url}/rest/api/3/issue/createmeta"
        params = {"projectKeys": project_key, "expand": "projects.issuetypes.fields"}
        response = self.session.get(url, headers=self.headers, auth=self.auth, params=params)
        return self._handle_response(response)

    def get_fields(self):
        url = f"{self.base_url}/rest/api/3/field"
        response = self.session.get(url, headers=self.headers, auth=self.auth)
        return self._handle_response(response)
    def get_board(self, board_id):
        url = f"{self.base_url}/rest/agile/1.0/board/{board_id}"
        response = self.session.get(url, headers=self.headers, auth=self.auth)
        return self._handle_response(response)
    def get_board_info(self, board_id):
        url = f"{self.base_url}/rest/agile/1.0/board/{board_id}"
        response = self.session.get(url, headers=self.headers, auth=self.auth)
        return self._handle_response(response)
    def get_board_issues(self, board_id, max_results=50, start_at=0):
        url = f"{self.base_url}/rest/agile/1.0/board/{board_id}/issue"
        params = {
            "startAt": start_at,
            "maxResults": max_results
        }
        response = self.session.get(url, headers=self.headers, auth=self.auth, params=params)
        return self._handle_response(response)
    def get_board_configuration(self, board_id):
        url = f"{self.base_url}/rest/agile/1.0/board/{board_id}/configuration"
        response = self.session.get(url, headers=self.headers, auth=self.auth)
        return self._handle_response(response)


if __name__ == "__main__":
    from dotenv import load_dotenv
    import os
    import json

    # Load environment variables from .env file
    load_dotenv()

    # Retrieve credentials and base URL
    BASE_URL = os.getenv("JIRA_BASE_URL")
    EMAIL = os.getenv("JIRA_EMAIL")
    API_TOKEN = os.getenv("JIRA_API_TOKEN")
    BOARD_ID = 34  # Set your board ID

    # Debug prints to verify environment variables
    token = API_TOKEN or ""
    print("EMAIL:", EMAIL or "None")
    print("TOKEN:", (token[:4] + "...") if token else "None")
    print("BASE_URL:", BASE_URL or "None")

    # Validate that all required environment variables are present
    if not BASE_URL or not EMAIL or not API_TOKEN:
        print("❗ ERROR: Missing one or more required environment variables (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN).")
        exit(1)

    try:
        print("\n✅ Environment variables loaded. Connecting to Jira...")
        client = JiraClient(BASE_URL, EMAIL, API_TOKEN)
        print("\n🔐 Testing authentication...")
        try:
            profile = client.test_auth()
            print("✅ Authenticated as:", profile.get("displayName"))
        except JiraClientException as e:
            print("❌ Authentication failed:", e)
            exit(1)


        print(f"\n📊 Fetching board info for board ID: {BOARD_ID}")
        board_info = client.get_board_info(BOARD_ID)
        print(json.dumps(board_info, indent=2))

        print(f"\n🧱 Fetching configuration for board ID: {BOARD_ID}")
        config = client.get_board_configuration(BOARD_ID)
        print(json.dumps(config, indent=2))

        print(f"\n📋 Fetching issues for board ID: {BOARD_ID}")
        issues = client.get_board_issues(BOARD_ID, max_results=10)
        for issue in issues.get("issues", []):
            print(f"- {issue['key']}: {issue['fields']['summary']}")

    except JiraClientException as e:
        print(f"\n❌ Jira API error: {e}")
    except Exception as ex:
        print(f"\n❗ Unexpected error: {ex}")

