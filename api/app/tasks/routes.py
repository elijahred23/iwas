from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User, Task, Workflow

tasks_bp = Blueprint("tasks", __name__)

def _user():
    try:
        return User.query.get(int(get_jwt_identity()))
    except Exception:
        return None

@tasks_bp.get("/")
@jwt_required()
def list_tasks():
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    status = (request.args.get("status") or "").strip() or None
    q = (db.session.query(Task, Workflow)
         .join(Workflow, Task.workflow_id == Workflow.id))
    if u.role != "admin":
        q = q.filter(Workflow.user_id == u.id)
    if status:
        q = q.filter(Task.status == status)
    q = q.order_by(Task.due_date.is_(None), Task.due_date.asc(), Task.id.desc())

    items = []
    for t, wf in q.all():
        items.append({
            "id": t.id,
            "name": t.name,
            "status": t.status,
            "assigned_to": t.assigned_to,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "workflow": {"id": wf.id, "name": wf.name}
        })
    return jsonify({"ok": True, "items": items})
