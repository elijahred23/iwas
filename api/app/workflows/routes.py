from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from ..extensions import db
from ..models import User, Workflow, Task, Log
from ..integrations.slack import send_slack

workflows_bp = Blueprint("workflows", __name__)

# ---------- helpers ----------

def _current_user():
    """
    Returns the current User instance from the JWT identity.
    Casts identity to int to avoid '1' vs 1 mismatches.
    """
    try:
        uid = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None
    return User.query.get(uid)

def _is_admin(user: User) -> bool:
    return bool(user and user.role == "admin")

def _notify(user_id: int, text: str) -> None:
    """Best-effort Slack notify; swallow any errors."""
    try:
        send_slack(user_id, text)
    except Exception:
        # You could add logging here if you want:
        # current_app.logger.exception("Slack notify failed")
        pass

# ---------- workflows CRUD ----------

@workflows_bp.get("/")
@jwt_required()
def list_workflows():
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    q = (request.args.get("q") or "").strip().lower()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    page = max(page, 1)
    per_page = min(max(per_page, 1), 100)

    query = Workflow.query
    if not _is_admin(user):
        query = query.filter(Workflow.user_id == user.id)
    else:
        user_id_param = request.args.get("user_id", type=int)
        if user_id_param:
            query = query.filter(Workflow.user_id == user_id_param)

    if q:
        query = query.filter(func.lower(Workflow.name).like(f"%{q}%"))

    query = query.order_by(Workflow.id.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "ok": True,
        "page": page,
        "per_page": per_page,
        "total": pagination.total,
        "items": [w.to_dict() for w in pagination.items],
    }), 200


@workflows_bp.post("/")
@jwt_required()
def create_workflow():
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip() or None

    if not name:
        return jsonify({"ok": False, "error": "name is required"}), 422

    owner_id = user.id
    if _is_admin(user) and data.get("user_id"):
        try:
            owner_id = int(data["user_id"])
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "user_id must be an integer"}), 422

    wf = Workflow(user_id=owner_id, name=name, description=description)
    db.session.add(wf)
    db.session.commit()

    # Slack: workflow created
    _notify(owner_id, f":sparkles: Workflow created — *{wf.name}* (#{wf.id})")

    return jsonify({"ok": True, "item": wf.to_dict()}), 201


@workflows_bp.get("/<int:wf_id>")
@jwt_required()
def get_workflow(wf_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    wf = Workflow.query.get(wf_id)
    if not wf:
        return jsonify({"ok": False, "error": "Not found"}), 404

    if not _is_admin(user) and wf.user_id != user.id:
        return jsonify({"ok": False, "error": "Not found"}), 404

    return jsonify({"ok": True, "item": wf.to_dict()}), 200


@workflows_bp.patch("/<int:wf_id>")
@jwt_required()
def update_workflow(wf_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    wf = Workflow.query.get(wf_id)
    if not wf:
        return jsonify({"ok": False, "error": "Not found"}), 404

    if not _is_admin(user) and wf.user_id != user.id:
        return jsonify({"ok": False, "error": "Not found"}), 404

    data = request.get_json(silent=True) or {}

    if "name" in data:
        new_name = (data.get("name") or "").strip()
        if not new_name:
            return jsonify({"ok": False, "error": "name cannot be empty"}), 422
        wf.name = new_name

    if "description" in data:
        wf.description = (data.get("description") or "").strip() or None

    if _is_admin(user) and "user_id" in data:
        try:
            wf.user_id = int(data["user_id"])
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "user_id must be an integer"}), 422

    db.session.commit()
    return jsonify({"ok": True, "item": wf.to_dict()}), 200


@workflows_bp.delete("/<int:wf_id>")
@jwt_required()
def delete_workflow(wf_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    wf = Workflow.query.get(wf_id)
    if not wf:
        return jsonify({"ok": False, "error": "Not found"}), 404

    if not _is_admin(user) and wf.user_id != user.id:
        return jsonify({"ok": False, "error": "Not found"}), 404

    owner_id = wf.user_id
    name = wf.name
    db.session.delete(wf)
    db.session.commit()

    # Slack: workflow deleted
    _notify(owner_id, f":wastebasket: Workflow deleted — *{name}* (#{wf_id})")

    return jsonify({"ok": True, "deleted": wf_id}), 200

# ---------- tasks CRUD + logs ----------

@workflows_bp.get("/<int:wf_id>/tasks")
@jwt_required()
def list_tasks(wf_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    wf = Workflow.query.get_or_404(wf_id)
    if not (_is_admin(user) or wf.user_id == user.id):
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    tasks = Task.query.filter_by(workflow_id=wf_id).order_by(Task.id.desc()).all()
    return jsonify({"ok": True, "items": [t.to_public() for t in tasks]}), 200


@workflows_bp.post("/<int:wf_id>/tasks")
@jwt_required()
def create_task(wf_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    wf = Workflow.query.get_or_404(wf_id)
    if not (_is_admin(user) or wf.user_id == user.id):
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    status = (data.get("status") or "pending").strip()
    assigned_to = (data.get("assigned_to") or "").strip()
    due = (data.get("due_date") or "").strip()

    if not name:
        return jsonify({"ok": False, "error": "name is required"}), 422

    due_date = None
    if due:
        try:
            due_date = date.fromisoformat(due)  # "YYYY-MM-DD"
        except ValueError:
            return jsonify({"ok": False, "error": "due_date must be YYYY-MM-DD"}), 422

    t = Task(workflow_id=wf_id, name=name, status=status, assigned_to=assigned_to, due_date=due_date)
    db.session.add(t)
    db.session.flush()  # get t.id
    db.session.add(Log(task_id=t.id, event="created", status=t.status))
    db.session.commit()

    # Slack: task created
    due_txt = f" • due {t.due_date.isoformat()}" if t.due_date else ""
    assigned_txt = f" • {t.assigned_to}" if t.assigned_to else ""
    _notify(wf.user_id, f":memo: Task created in *{wf.name}* — “{t.name}” (#{t.id}) • {t.status}{assigned_txt}{due_txt}")

    return jsonify({"ok": True, "item": t.to_public()}), 201


@workflows_bp.patch("/tasks/<int:task_id>")
@jwt_required()
def update_task(task_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    t = Task.query.get_or_404(task_id)
    if not (_is_admin(user) or t.workflow.user_id == user.id):
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}

    before = {
        "name": t.name,
        "status": t.status,
        "assigned_to": t.assigned_to,
        "due_date": t.due_date.isoformat() if t.due_date else None,
    }

    if "name" in data and isinstance(data["name"], str):
        t.name = data["name"].strip() or t.name
    if "status" in data and isinstance(data["status"], str):
        t.status = data["status"].strip() or t.status
    if "assigned_to" in data and isinstance(data["assigned_to"], str):
        t.assigned_to = data["assigned_to"].strip()
    if "due_date" in data:
        raw = (data.get("due_date") or "").strip()
        if raw:
            try:
                t.due_date = date.fromisoformat(raw)
            except ValueError:
                return jsonify({"ok": False, "error": "due_date must be YYYY-MM-DD"}), 422
        else:
            t.due_date = None

    db.session.flush()

    after = {
        "name": t.name,
        "status": t.status,
        "assigned_to": t.assigned_to,
        "due_date": t.due_date.isoformat() if t.due_date else None,
    }
    changes = ", ".join(f"{k}: '{before[k]}'→'{after[k]}'" for k in before if before[k] != after[k]) or "updated"

    db.session.add(Log(task_id=t.id, event=changes, status=t.status))
    db.session.commit()

    # Slack: task updated
    _notify(t.workflow.user_id, f":pencil2: Task updated in *{t.workflow.name}* — “{t.name}” (#{t.id}) • {changes}")

    return jsonify({"ok": True, "item": t.to_public()}), 200


@workflows_bp.delete("/tasks/<int:task_id>")
@jwt_required()
def delete_task(task_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    t = Task.query.get_or_404(task_id)
    if not (_is_admin(user) or t.workflow.user_id == user.id):
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    wf = t.workflow
    name = t.name
    tid = t.id

    db.session.delete(t)
    db.session.commit()

    # Slack: task deleted
    _notify(wf.user_id, f":wastebasket: Task deleted in *{wf.name}* — “{name}” (#{tid})")

    return jsonify({"ok": True}), 200


@workflows_bp.get("/tasks/<int:task_id>/logs")
@jwt_required()
def task_logs(task_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    t = Task.query.get_or_404(task_id)
    if not (_is_admin(user) or t.workflow.user_id == user.id):
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    logs = Log.query.filter_by(task_id=task_id).order_by(Log.id.desc()).all()
    return jsonify({"ok": True, "items": [l.to_public() for l in logs]}), 200
