import requests
import logging
import base64

class GitHubClientException(Exception):
    pass

class GitHubClient:
    def __init__(self, token: str, owner: str, repo: str):
        self.base_url = "https://api.github.com"
        self.token = token
        self.owner = owner
        self.repo = repo
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json"
        }

    def _handle_response(self, response):
        if not response.ok:
            logging.error(f"GitHub API error: {response.status_code} - {response.text}")
            raise GitHubClientException(f"GitHub error {response.status_code}: {response.text}")
        return response.json()

    # Basic issue operations
    def create_issue(self, title: str, body: str = "", labels: list = None, assignees: list = None):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/issues"
        payload = {
            "title": title,
            "body": body,
            "labels": labels or [],
            "assignees": assignees or []
        }
        response = requests.post(url, json=payload, headers=self.headers)
        return self._handle_response(response)

    def get_issue(self, issue_number: int):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/issues/{issue_number}"
        response = requests.get(url, headers=self.headers)
        return self._handle_response(response)

    def comment_on_issue(self, issue_number: int, comment: str):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/issues/{issue_number}/comments"
        response = requests.post(url, json={"body": comment}, headers=self.headers)
        return self._handle_response(response)

    def list_issues(self, state: str = "open"):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/issues"
        params = {"state": state}
        response = requests.get(url, headers=self.headers, params=params)
        return self._handle_response(response)

    # Pull requests
    def create_pull_request(self, title: str, head: str, base: str = "main", body: str = ""):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/pulls"
        payload = {
            "title": title,
            "head": head,
            "base": base,
            "body": body
        }
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def merge_pull_request(self, pr_number: int, commit_message: str = ""):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/pulls/{pr_number}/merge"
        payload = {
            "commit_message": commit_message
        }
        response = requests.put(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def list_review_comments(self, pr_number: int):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/pulls/{pr_number}/comments"
        response = requests.get(url, headers=self.headers)
        return self._handle_response(response)

    def list_pull_requests(self, state: str = "open"):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/pulls"
        params = {"state": state}
        response = requests.get(url, headers=self.headers, params=params)
        return self._handle_response(response)

    # Repos
    def get_repo_info(self):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}"
        response = requests.get(url, headers=self.headers)
        return self._handle_response(response)

    # Workflows
    def list_workflows(self):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/workflows"
        response = requests.get(url, headers=self.headers)
        return self._handle_response(response)

    def trigger_workflow_dispatch(self, workflow_id: str, ref: str = "main", inputs: dict = None):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/workflows/{workflow_id}/dispatches"
        payload = {
            "ref": ref,
            "inputs": inputs or {}
        }
        response = requests.post(url, json=payload, headers=self.headers)
        if response.status_code != 204:
            self._handle_response(response)
        return {"message": "Workflow dispatched successfully."}

    # Branch management
    def create_branch(self, branch_name: str, source_branch: str = "main"):
        ref_url = f"{self.base_url}/repos/{self.owner}/{self.repo}/git/ref/heads/{source_branch}"
        ref_response = requests.get(ref_url, headers=self.headers)
        sha = self._handle_response(ref_response)["object"]["sha"]

        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/git/refs"
        payload = {
            "ref": f"refs/heads/{branch_name}",
            "sha": sha
        }
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def delete_branch(self, branch_name: str):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/git/refs/heads/{branch_name}"
        response = requests.delete(url, headers=self.headers)
        if response.status_code != 204:
            self._handle_response(response)
        return {"message": f"Branch '{branch_name}' deleted."}

    # Files
    def get_file(self, path: str, branch: str = "main"):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/contents/{path}"
        response = requests.get(url, headers=self.headers, params={"ref": branch})
        return self._handle_response(response)

    def create_or_update_file(self, path: str, content: str, message: str, branch: str = "main", sha: str = None):
        encoded = base64.b64encode(content.encode()).decode()
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/contents/{path}"
        payload = {
            "message": message,
            "content": encoded,
            "branch": branch
        }
        if sha:
            payload["sha"] = sha

        response = requests.put(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def delete_file(self, path: str, message: str, sha: str, branch: str = "main"):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/contents/{path}"
        payload = {
            "message": message,
            "sha": sha,
            "branch": branch
        }
        response = requests.delete(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    # Commits
    def get_commit(self, sha: str):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/commits/{sha}"
        response = requests.get(url, headers=self.headers)
        return self._handle_response(response)

    def list_commits(self, path: str = None):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/commits"
        params = {"path": path} if path else {}
        response = requests.get(url, headers=self.headers, params=params)
        return self._handle_response(response)

    def set_commit_status(self, sha: str, state: str, description: str, context: str):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/statuses/{sha}"
        payload = {
            "state": state,
            "description": description,
            "context": context
        }
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    # Labels and milestones
    def create_label(self, name: str, color: str, description: str = ""):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/labels"
        payload = {"name": name, "color": color, "description": description}
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def create_milestone(self, title: str, description: str = "", due_on: str = None):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/milestones"
        payload = {"title": title, "description": description}
        if due_on:
            payload["due_on"] = due_on
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    # Webhooks
    def list_webhooks(self):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/hooks"
        response = requests.get(url, headers=self.headers)
        return self._handle_response(response)

    def create_webhook(self, callback_url: str, events: list = None):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/hooks"
        payload = {
            "name": "web",
            "active": True,
            "events": events or ["push"],
            "config": {
                "url": callback_url,
                "content_type": "json"
            }
        }
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def delete_webhook(self, hook_id: int):
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/hooks/{hook_id}"
        response = requests.delete(url, headers=self.headers)
        if response.status_code != 204:
            self._handle_response(response)
        return {"message": "Webhook deleted"}