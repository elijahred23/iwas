# api/app/analytics/routes.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from ..extensions import db
from ..models import User, Task, Workflow

analytics_bp = Blueprint("analytics", __name__)

def _user():
    try:
        return User.query.get(int(get_jwt_identity()))
    except Exception:
        return None

@analytics_bp.get("/summary")
@jwt_required()
def summary():
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    q_tasks = db.session.query(Task)
    q_wf = db.session.query(Workflow)
    if u.role != "admin":
        q_tasks = q_tasks.join(Workflow, Task.workflow_id == Workflow.id).filter(Workflow.user_id == u.id)
        q_wf = q_wf.filter(Workflow.user_id == u.id)

    total_tasks = q_tasks.count()
    done_tasks = q_tasks.filter(Task.status == "done").count()
    pending_tasks = total_tasks - done_tasks
    total_workflows = q_wf.count()

    return jsonify({
        "ok": True,
        "summary": {
            "workflows": total_workflows,
            "tasks_total": total_tasks,
            "tasks_done": done_tasks,
            "tasks_pending": pending_tasks,
        }
    })

@analytics_bp.get("/daily")
@jwt_required()
def daily():
    """Tasks created per day (last N days)."""
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    days = max(1, min(int(request.args.get("days", 14)), 90))
    q = db.session.query(func.date(Task.created_at).label("d"), func.count().label("c"))
    if u.role != "admin":
        q = q.join(Workflow, Task.workflow_id == Workflow.id).filter(Workflow.user_id == u.id)
    q = q.group_by("d").order_by("d desc").limit(days)

    rows = q.all()
    items = [{"date": str(d), "count": int(c)} for d, c in reversed(rows)]
    return jsonify({"ok": True, "items": items})
