from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from ..extensions import db
from ..models import User, Log, Task, Workflow

logs_bp = Blueprint("logs", __name__)

def _user():
    try:
        return User.query.get(int(get_jwt_identity()))
    except Exception:
        return None

@logs_bp.get("/recent")
@jwt_required()
def recent():
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    limit = max(1, min(int(request.args.get("limit", 100)), 500))

    q = (db.session.query(Log, Task, Workflow, User)
         .join(Task, Log.task_id == Task.id)
         .join(Workflow, Task.workflow_id == Workflow.id)
         .outerjoin(User, Log.actor_id == User.id))
    if u.role != "admin":
        q = q.filter(Workflow.user_id == u.id)
    q = q.order_by(Log.id.desc()).limit(limit)

    items = []
    for log, task, wf, actor in q.all():
        items.append({
            "id": log.id,
            "timestamp": log.timestamp.isoformat(sep=" ", timespec="seconds") if log.timestamp else None,
            "event": log.event,
            "status": log.status,
            "duration_ms": log.duration_ms,
            "task": {"id": task.id, "name": task.name},
            "workflow": {"id": wf.id, "name": wf.name, "user_id": wf.user_id},
            "actor": {"id": actor.id, "name": actor.name, "email": actor.email} if actor else None,
        })
    return jsonify({"ok": True, "items": items})
