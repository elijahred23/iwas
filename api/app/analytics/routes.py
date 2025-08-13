# api/app/analytics/routes.py
from datetime import date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, case
from ..extensions import db
from ..models import User, Task, Workflow, Log  # <-- include Log

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
        q_tasks = (
            q_tasks.join(Workflow, Task.workflow_id == Workflow.id)
                   .filter(Workflow.user_id == u.id)
        )
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

    # keep references to labeled columns
    d_col = func.date(Task.created_at).label("d")
    c_col = func.count().label("c")

    q = db.session.query(d_col, c_col)
    if u.role != "admin":
        q = (
            q.join(Workflow, Task.workflow_id == Workflow.id)
             .filter(Workflow.user_id == u.id)
        )

    # order by the column object, not a string label
    q = q.group_by(d_col).order_by(d_col.desc()).limit(days)

    # present oldest→newest
    rows = list(reversed(q.all()))
    items = [{"date": str(d), "count": int(c)} for d, c in rows]
    return jsonify({"ok": True, "items": items})


@analytics_bp.get("/statuses")
@jwt_required()
def statuses():
    """Break down tasks by status with percentages."""
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    q = (db.session.query(Task.status, func.count())
         .select_from(Task)
         .join(Workflow, Task.workflow_id == Workflow.id))
    if u.role != "admin":
        q = q.filter(Workflow.user_id == u.id)
    rows = q.group_by(Task.status).all()

    total = sum(c for _, c in rows) or 0
    breakdown = []
    for s, c in rows:
        status = s or "unknown"
        pct = round((c / total * 100.0), 1) if total else 0.0
        breakdown.append({"status": status, "count": int(c), "pct": pct})

    return jsonify({"ok": True, "total": total, "breakdown": breakdown})

@analytics_bp.get("/overdue")
@jwt_required()
def overdue():
    """Counts of due today / overdue + a small list of top overdue tasks."""
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    today = date.today()
    base = (db.session.query(Task, Workflow)
            .join(Workflow, Task.workflow_id == Workflow.id))
    if u.role != "admin":
        base = base.filter(Workflow.user_id == u.id)

    due_today_count = (base.filter(Task.due_date == today, Task.status != "done")
                           .count())
    overdue_q = base.filter(Task.due_date < today, Task.status != "done")
    overdue_count = overdue_q.count()

    top_n = request.args.get("limit", 10, type=int)
    top = (overdue_q.with_entities(
                Task.id,
                Task.name,
                Task.due_date,
                Workflow.id.label("workflow_id"),
                Workflow.name.label("workflow_name"),
            )
            .order_by(Task.due_date.asc())
            .limit(top_n)
            .all())

    items = []
    for tid, name, due, wf_id, wf_name in top:
        items.append({
            "id": tid,
            "name": name,
            "workflow": {"id": wf_id, "name": wf_name},
            "due_date": due.isoformat() if due else None,
            "days_overdue": (today - due).days if due else None,
        })

    return jsonify({
        "ok": True,
        "due_today": due_today_count,
        "overdue": overdue_count,
        "top_overdue": items
    })

@analytics_bp.get("/recent")
@jwt_required()
def recent():
    """Last N log entries across your workflows."""
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    limit = request.args.get("limit", 10, type=int)
    rows = (db.session.query(Log, Task, Workflow)
            .join(Task, Log.task_id == Task.id)
            .join(Workflow, Task.workflow_id == Workflow.id))
    if u.role != "admin":
        rows = rows.filter(Workflow.user_id == u.id)
    rows = rows.order_by(Log.id.desc()).limit(limit).all()

    items = [{
        "log_id": L.id,
        "timestamp": (L.timestamp.isoformat() if L.timestamp else None),
        "event": L.event,
        "status": L.status,
        "task": {"id": T.id, "name": T.name},
        "workflow": {"id": W.id, "name": W.name},
    } for (L, T, W) in rows]

    return jsonify({"ok": True, "items": items})

@analytics_bp.get("/workflows/top")
@jwt_required()
def top_workflows():
    """Top workflows ranked by open (non-done) tasks, plus done counts."""
    u = _user()
    if not u:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    limit = request.args.get("limit", 5, type=int)
    open_expr = func.sum(case((Task.status != "done", 1), else_=0))
    done_expr = func.sum(case((Task.status == "done", 1), else_=0))

    q = (db.session.query(
            Workflow.id,
            Workflow.name,
            open_expr.label("open_count"),
            done_expr.label("done_count"),
         )
         .outerjoin(Task, Task.workflow_id == Workflow.id))
    if u.role != "admin":
        q = q.filter(Workflow.user_id == u.id)

    rows = (q.group_by(Workflow.id, Workflow.name)
             .order_by(open_expr.desc(), Workflow.id.asc())
             .limit(limit)
             .all())

    items = [{
        "id": wid,
        "name": wname,
        "open": int(open_ or 0),
        "done": int(done or 0),
    } for (wid, wname, open_, done) in rows]

    return jsonify({"ok": True, "items": items})
