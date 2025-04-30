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
