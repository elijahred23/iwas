# api/app/integrations/routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import User, Integration
from ..extensions import db
from .slack import save_slack_webhook, get_slack_webhook, send_slack
from .github import whoami, list_repos, create_issue, GitHubError

integrations_bp = Blueprint("integrations", __name__)

def _current_user():
    uid = get_jwt_identity()
    return User.query.get(uid)

@integrations_bp.get("/")
@jwt_required()
def list_integrations():
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    rows = Integration.query.filter_by(user_id=user.id).all()
    items = []
    for r in rows:
        # don’t leak secrets, just indicate presence
        items.append({"id": r.id, "type": r.type, "configured": True})
    return jsonify({"ok": True, "items": items})

@integrations_bp.post("/slack")
@jwt_required()
def upsert_slack():
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    data = request.get_json(silent=True) or {}
    url = (data.get("webhook_url") or "").strip()
    if not (url.startswith("https://hooks.slack.com/") or url.startswith("https://hooks.slack.com/services/")):
        return jsonify({"ok": False, "error": "Invalid Slack webhook URL"}), 422
    iid = save_slack_webhook(user.id, url)
    return jsonify({"ok": True, "id": iid})

@integrations_bp.post("/slack/test")
@jwt_required()
def slack_test():
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    url = get_slack_webhook(user.id)
    if not url:
        return jsonify({"ok": False, "error": "No Slack webhook configured"}), 404
    status = send_slack(user.id, f"Hello {user.name}! Slack is wired up ✅")
    return jsonify({"ok": True, "status": status})

# --- Save GitHub config ---
@integrations_bp.post("/github")
@jwt_required()
def save_github():
    user = _current_user()
    body = request.get_json(silent=True) or {}
    api_base = (body.get("api_base") or "https://api.github.com").strip()
    token = (body.get("token") or "").strip()
    default_repo = (body.get("default_repo") or "").strip() or None
    if not token:
        return jsonify({"ok": False, "error": "token is required"}), 422

    integ = Integration.query.filter_by(user_id=user.id, type="github").first()
    created = False
    if not integ:
        integ = Integration(user_id=user.id, type="github", credentials="")
        created = True
    integ.set_github(api_base, token, default_repo)
    db.session.add(integ)
    db.session.commit()
    return jsonify({"ok": True, "item": integ.to_public()}), (201 if created else 200)

# --- Test token ---
@integrations_bp.post("/github/test")
@jwt_required()
def github_test():
    user = _current_user()
    integ = Integration.query.filter_by(user_id=user.id, type="github").first()
    if not integ:
        return jsonify({"ok": False, "error": "GitHub not configured"}), 400
    cfg = integ.get_github()
    try:
        me = whoami(cfg["api_base"], cfg["token"])
        return jsonify({"ok": True, "user": {"id": me["id"], "login": me["login"], "name": me.get("name")}})
    except GitHubError as e:
        return jsonify({"ok": False, "error": str(e)}), 400

# --- List repos you can access ---
@integrations_bp.get("/github/repos")
@jwt_required()
def github_repos():
    user = _current_user()
    integ = Integration.query.filter_by(user_id=user.id, type="github").first()
    if not integ:
        return jsonify({"ok": False, "error": "GitHub not configured"}), 400
    cfg = integ.get_github()
    try:
        repos = list_repos(cfg["api_base"], cfg["token"])
        items = [
            {
                "id": r["id"],
                "full_name": r["full_name"],  # owner/repo
                "html_url": r.get("html_url"),
                "private": r.get("private"),
            }
            for r in repos
        ]
        return jsonify({"ok": True, "items": items})
    except GitHubError as e:
        return jsonify({"ok": False, "error": str(e)}), 400

# --- Create an issue in a repo ---
@integrations_bp.post("/github/repos/<owner>/<repo>/issues")
@jwt_required()
def github_create_issue(owner, repo):
    user = _current_user()
    integ = Integration.query.filter_by(user_id=user.id, type="github").first()
    if not integ:
        return jsonify({"ok": False, "error": "GitHub not configured"}), 400

    body = request.get_json(silent=True) or {}
    title = (body.get("title") or "").strip()
    desc = (body.get("description") or "").strip() or None
    if not title:
        return jsonify({"ok": False, "error": "title is required"}), 422

    cfg = integ.get_github()
    try:
        issue = create_issue(cfg["api_base"], cfg["token"], owner, repo, title, desc)
        return jsonify({
            "ok": True,
            "issue": {
                "number": issue.get("number"),
                "id": issue.get("id"),
                "html_url": issue.get("html_url"),
                "title": issue.get("title"),
                "state": issue.get("state"),
            }
        }), 201
    except GitHubError as e:
        return jsonify({"ok": False, "error": str(e)}), 400