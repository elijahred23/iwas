from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from ..extensions import db
from ..models import User, Log, Task, Workflow, ApiEvent

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
            "service": log.service,
            "error_message": log.error_message,
            "task": {"id": task.id, "name": task.name},
            "workflow": {"id": wf.id, "name": wf.name, "user_id": wf.user_id},
            "actor": {"id": actor.id, "name": actor.name, "email": actor.email} if actor else None,
        })
    return jsonify({"ok": True, "items": items})


@logs_bp.post("/record")
@jwt_required()
def record():
    """
    Record a failure/event log with error context. Requires task_id.
    """
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    body = request.get_json(silent=True) or {}
    task_id = body.get("task_id")
    if not task_id:
        return jsonify({"ok": False, "error": "task_id is required"}), 422

    task = Task.query.get(task_id)
    if not task:
        return jsonify({"ok": False, "error": "Task not found"}), 404

    if u.role != "admin" and task.workflow.user_id != u.id:
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    log = Log(
        task_id=task.id,
        actor_id=u.id,
        event=body.get("event") or "failure",
        status=body.get("status") or "failed",
        duration_ms=body.get("duration_ms"),
        service=body.get("service"),
        error_message=body.get("error_message"),
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({"ok": True, "item": log.to_public()})


@logs_bp.get("/errors")
@jwt_required()
def recent_errors():
    """
    Return recent API-level error events (5xx) captured globally.
    """
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    limit = max(1, min(int(request.args.get("limit", 100)), 500))

    q = ApiEvent.query.order_by(ApiEvent.id.desc()).limit(limit)
    items = [e.to_public() for e in q.all()]
    return jsonify({"ok": True, "items": items})
