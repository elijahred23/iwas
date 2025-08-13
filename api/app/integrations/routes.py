# api/app/integrations/routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import User, Integration
from ..extensions import db
from .slack import save_slack_webhook, get_slack_webhook, send_slack

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
