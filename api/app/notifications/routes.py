from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc
from ..extensions import db
from ..models import User, Log, Task, Workflow

notifications_bp = Blueprint("notifications", __name__)

def _user():
    try:
        return User.query.get(int(get_jwt_identity()))
    except Exception:
        return None

@notifications_bp.get("/recent")
@jwt_required()
def recent():
    """
    Return recent task log events across all workflows the user can see.
    Optional query params:
      - limit (1..200), default 50
      - after_id (return items with id > after_id) for incremental polling
    """
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    limit = max(1, min(int(request.args.get("limit", 50)), 200))
    after_id = request.args.get("after_id", type=int)

    q = (
        db.session.query(Log, Task, Workflow)
        .join(Task, Log.task_id == Task.id)
        .join(Workflow, Task.workflow_id == Workflow.id)
    )
    if u.role != "admin":
        q = q.filter(Workflow.user_id == u.id)
    if after_id:
        q = q.filter(Log.id > after_id)

    q = q.order_by(desc(Log.id)).limit(limit)
    rows = q.all()

    items = []
    for log, task, wf in rows:
        items.append({
            "id": log.id,
            "when": log.timestamp.isoformat() if log.timestamp else None,
            "event": log.event,
            "status": log.status,
            "task": {"id": task.id, "name": task.name, "status": task.status},
            "workflow": {"id": wf.id, "name": wf.name},
        })

    return jsonify({"ok": True, "items": items})
