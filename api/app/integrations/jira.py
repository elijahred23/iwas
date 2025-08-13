# api/app/integrations/jira.py
from __future__ import annotations

import json
from typing import Dict, Any, Tuple, Optional
from urllib.parse import quote

import requests
from requests.auth import HTTPBasicAuth
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import User, Integration

jira_bp = Blueprint("jira", __name__)

# ---------- helpers ----------

def _uid() -> Optional[int]:
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

def _get_or_create_integration(user_id: int, typ: str) -> Integration:
    integ = Integration.query.filter_by(user_id=user_id, type=typ).first()
    if not integ:
        integ = Integration(user_id=user_id, type=typ, credentials="{}")
        db.session.add(integ)
        db.session.flush()
    return integ

def _load_creds(integ: Optional[Integration]) -> Dict[str, Any]:
    if not integ:
        return {}
    try:
        return json.loads(integ.credentials or "{}")
    except Exception:
        return {}

def _save_creds(integ: Integration, creds: Dict[str, Any]) -> None:
    integ.credentials = json.dumps(creds)
    db.session.add(integ)
    db.session.commit()

def _mask(v: Optional[str], keep: int = 4) -> Optional[str]:
    if not v:
        return v
    if len(v) <= keep:
        return "*" * len(v)
    return "*" * (len(v) - keep) + v[-keep:]

def _jira_auth(creds: Dict[str, Any]) -> Tuple[str, HTTPBasicAuth]:
    base = (creds.get("base_url") or "").rstrip("/")
    email = creds.get("email") or ""
    token = creds.get("api_token") or ""
    return base, HTTPBasicAuth(email, token)

def _error_from_response(r: requests.Response) -> str:
    try:
        data = r.json()
        if isinstance(data, dict):
            if data.get("errorMessages"):
                return "; ".join(data["errorMessages"])
            if isinstance(data.get("errors"), dict):
                return "; ".join(f"{k}: {v}" for k, v in data["errors"].items())
    except Exception:
        pass
    return f"{r.status_code} {r.reason}"

def _require_creds(creds: Dict[str, Any]) -> Optional[str]:
    if not (creds.get("base_url") and creds.get("email") and creds.get("api_token")):
        return "Jira base_url, email, and api_token are required. Save them first."
    return None

def _public_creds(creds: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "base_url": creds.get("base_url"),
        "email": creds.get("email"),
        "api_token": _mask(creds.get("api_token")),
        "default_project": creds.get("default_project"),
    }

def _adf(text: str) -> Dict[str, Any]:
    """Minimal Atlassian Document Format for a plain-text paragraph."""
    return {
        "type": "doc",
        "version": 1,
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": text}]}
        ],
    }

def _create_issue(base: str, auth: HTTPBasicAuth, project_key: str,
                  summary: str, description: Optional[str],
                  issue_type: str = "Task") -> Dict[str, Any]:
    url = f"{base}/rest/api/3/issue"
    fields: Dict[str, Any] = {
        "project": {"key": project_key},
        "summary": summary,
        "issuetype": {"name": issue_type},
    }
    if description:
        # Jira Cloud expects description in ADF
        fields["description"] = _adf(description)

    payload = {"fields": fields}
    r = requests.post(
        url,
        json=payload,
        auth=auth,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        timeout=20,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(_error_from_response(r))
    return r.json()

# ---------- routes ----------

@jira_bp.post("/jira")
@jwt_required()
def save_jira():
    """Save Jira credentials for the current user."""
    uid = _uid()
    if not uid:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    user = User.query.get(uid)
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    base_url = (payload.get("base_url") or "").strip().rstrip("/")
    email = (payload.get("email") or "").strip()
    api_token = (payload.get("api_token") or "").strip()
    default_project = (payload.get("default_project") or "").strip() or None

    if not base_url or not email or not api_token:
        return jsonify({"ok": False, "error": "base_url, email, and api_token are required"}), 422

    integ = _get_or_create_integration(user.id, "jira")
    creds = _load_creds(integ)
    creds.update({
        "base_url": base_url,
        "email": email,
        "api_token": api_token,
        "default_project": default_project,
    })
    _save_creds(integ, creds)

    return jsonify({
        "ok": True,
        "item": {
            "id": integ.id,
            "type": integ.type,
            "user_id": integ.user_id,
            "credentials": _public_creds(creds)
        }
    }), 200


@jira_bp.post("/jira/test")
@jwt_required()
def test_jira():
    """Verify Jira credentials by fetching a small page of projects."""
    uid = _uid()
    if not uid:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    integ = Integration.query.filter_by(user_id=uid, type="jira").first()
    creds = _load_creds(integ)

    # allow one-off overrides in the request body (handy for testing)
    body = request.get_json(silent=True) or {}
    for k in ("base_url", "email", "api_token"):
        if body.get(k):
            creds[k] = (body.get(k) or "").strip()

    missing = _require_creds(creds)
    if missing:
        return jsonify({"ok": False, "error": missing}), 422

    base, auth = _jira_auth(creds)
    url = f"{base}/rest/api/3/project/search?maxResults=1"

    try:
        r = requests.get(url, auth=auth, timeout=12)
    except requests.RequestException as e:
        return jsonify({"ok": False, "error": str(e)}), 502

    if r.status_code != 200:
        return jsonify({"ok": False, "error": _error_from_response(r)}), 400

    data = r.json()
    values = data.get("values") or []
    first = values[0] if values else None

    return jsonify({
        "ok": True,
        "result": {
            "projects_seen": data.get("total", len(values)),
            "sample": (
                {"id": first.get("id"), "key": first.get("key"), "name": first.get("name")}
                if first else None
            ),
        },
    }), 200


@jira_bp.get("/jira/projects")
@jwt_required()
def list_projects():
    """List projects visible to the user."""
    uid = _uid()
    if not uid:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    integ = Integration.query.filter_by(user_id=uid, type="jira").first()
    creds = _load_creds(integ)
    missing = _require_creds(creds)
    if missing:
        return jsonify({"ok": False, "error": missing}), 422

    base, auth = _jira_auth(creds)
    q = (request.args.get("q") or "").strip()
    url = f"{base}/rest/api/3/project/search?maxResults=50"
    if q:
        url += f"&query={quote(q)}"

    try:
        r = requests.get(url, auth=auth, timeout=15)
    except requests.RequestException as e:
        return jsonify({"ok": False, "error": str(e)}), 502

    if r.status_code != 200:
        return jsonify({"ok": False, "error": _error_from_response(r)}), 400

    data = r.json()
    values = data.get("values") or []
    items = [{"id": p.get("id"), "key": p.get("key"), "name": p.get("name")} for p in values]
    return jsonify({"ok": True, "items": items}), 200


@jira_bp.post("/jira/projects/<string:project_key>/issues")
@jwt_required()
def create_issue_for_project(project_key: str):
    """Create a Jira issue in the given project (path param)."""
    uid = _uid()
    if not uid:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    integ = Integration.query.filter_by(user_id=uid, type="jira").first()
    creds = _load_creds(integ)
    missing = _require_creds(creds)
    if missing:
        return jsonify({"ok": False, "error": missing}), 422

    body = request.get_json(silent=True) or {}
    summary = (body.get("summary") or "").strip()
    description = (body.get("description") or "").strip() or None
    issue_type = (body.get("issuetype") or body.get("issue_type") or "Task").strip()

    if not summary:
        return jsonify({"ok": False, "error": "summary is required"}), 422

    base, auth = _jira_auth(creds)

    try:
        issue = _create_issue(base, auth, project_key, summary, description, issue_type)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    return jsonify({
        "ok": True,
        "issue": {"id": issue.get("id"), "key": issue.get("key"), "self": issue.get("self")}
    }), 201


@jira_bp.post("/jira/issues")
@jwt_required()
def create_issue_default():
    """
    Create a Jira issue using the user's saved default_project,
    or a project_key passed in the JSON body.
    """
    uid = _uid()
    if not uid:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    integ = Integration.query.filter_by(user_id=uid, type="jira").first()
    creds = _load_creds(integ)
    missing = _require_creds(creds)
    if missing:
        return jsonify({"ok": False, "error": missing}), 422

    body = request.get_json(silent=True) or {}
    summary = (body.get("summary") or "").strip()
    description = (body.get("description") or "").strip() or None
    issue_type = (body.get("issuetype") or body.get("issue_type") or "Task").strip()
    project_key = (body.get("project_key") or "").strip() or creds.get("default_project")

    if not summary:
        return jsonify({"ok": False, "error": "summary is required"}), 422
    if not project_key:
        return jsonify({"ok": False, "error": "project_key is required (or set default_project)"}), 422

    base, auth = _jira_auth(creds)

    try:
        issue = _create_issue(base, auth, project_key, summary, description, issue_type)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

    return jsonify({
        "ok": True,
        "issue": {"id": issue.get("id"), "key": issue.get("key"), "self": issue.get("self")}
    }), 201

