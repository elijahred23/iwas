import requests

class GitHubError(Exception):
    pass

def _headers(token: str):
    if not token:
        raise GitHubError("Missing GitHub token")
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

def _url(api_base: str, path: str) -> str:
    base = (api_base or "https://api.github.com").rstrip("/")
    path = path[1:] if path.startswith("/") else path
    return f"{base}/{path}"

def _req(api_base: str, token: str, method: str, path: str, json=None, params=None, timeout=12):
    r = requests.request(
        method,
        _url(api_base, path),
        headers=_headers(token),
        json=json,
        params=params,
        timeout=timeout,
    )
    if r.status_code >= 400:
        try:
            j = r.json()
        except Exception:
            j = r.text
        raise GitHubError(f"{r.status_code}: {j}")
    return None if r.status_code == 204 else r.json()

def whoami(api_base: str, token: str):
    return _req(api_base, token, "GET", "/user")

def list_repos(api_base: str, token: str, per_page=50):
    # Lists repos you have access to
    params = {"per_page": per_page, "sort": "updated", "affiliation": "owner,collaborator,organization_member"}
    return _req(api_base, token, "GET", "/user/repos", params=params)

def create_issue(api_base: str, token: str, owner: str, repo: str, title: str, body: str | None = None):
    payload = {"title": title}
    if body:
        payload["body"] = body
    return _req(api_base, token, "POST", f"/repos/{owner}/{repo}/issues", json=payload)
