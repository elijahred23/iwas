# api/app/workflows/routes.py
from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from ..extensions import db
from ..models import User, Workflow, Task

workflows_bp = Blueprint("workflows", __name__)

def _current_user():
    uid = get_jwt_identity()
    return User.query.get(uid)

@workflows_bp.get("/")
@jwt_required()
def list_workflows():
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    is_admin = user.role == "admin"

    q = (request.args.get("q") or "").strip().lower()
    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 20)), 1), 100)

    query = Workflow.query
    if not is_admin:
        query = query.filter(Workflow.user_id == user.id)
    else:
        user_id_param = request.args.get("user_id")
        if user_id_param:
            query = query.filter(Workflow.user_id == int(user_id_param))

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
    is_admin = user.role == "admin"

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()

    if not name:
        return jsonify({"ok": False, "error": "name is required"}), 422

    owner_id = user.id
    if is_admin and data.get("user_id"):
        owner_id = int(data["user_id"])

    wf = Workflow(user_id=owner_id, name=name, description=description or None)
    db.session.add(wf)
    db.session.commit()
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

    if user.role != "admin" and wf.user_id != user.id:
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

    if user.role != "admin" and wf.user_id != user.id:
        return jsonify({"ok": False, "error": "Not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        new_name = (data.get("name") or "").strip()
        if not new_name:
            return jsonify({"ok": False, "error": "name cannot be empty"}), 422
        wf.name = new_name
    if "description" in data:
        wf.description = (data.get("description") or "").strip() or None

    if user.role == "admin" and "user_id" in data:
        wf.user_id = int(data["user_id"])

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

    if user.role != "admin" and wf.user_id != user.id:
        return jsonify({"ok": False, "error": "Not found"}), 404

    db.session.delete(wf)
    db.session.commit()
    return jsonify({"ok": True, "deleted": wf_id}), 200

# -------- Tasks --------

@workflows_bp.get("/<int:wf_id>/tasks")
@jwt_required()
def list_tasks(wf_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    wf = Workflow.query.get_or_404(wf_id)
    if user.role != "admin" and wf.user_id != user.id:
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    tasks = Task.query.filter_by(workflow_id=wf_id).order_by(Task.id.desc()).all()
    return jsonify({"ok": True, "items": [t.to_dict() for t in tasks]}), 200

@workflows_bp.post("/<int:wf_id>/tasks")
@jwt_required()
def create_task(wf_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    wf = Workflow.query.get_or_404(wf_id)
    if user.role != "admin" and wf.user_id != user.id:
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
            due_date = date.fromisoformat(due)  # YYYY-MM-DD
        except ValueError:
            return jsonify({"ok": False, "error": "due_date must be YYYY-MM-DD"}), 422

    t = Task(
        workflow_id=wf_id,
        name=name,
        status=status,
        assigned_to=assigned_to,
        due_date=due_date,
    )
    db.session.add(t)
    db.session.commit()
    return jsonify({"ok": True, "item": t.to_dict()}), 201


@workflows_bp.patch("/tasks/<int:task_id>")
@jwt_required()
def update_task(task_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    t = Task.query.get_or_404(task_id)
    if user.role != "admin" and t.workflow.user_id != user.id:
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    for field in ("name", "status", "assigned_to"):
        if field in data and isinstance(data[field], str):
            setattr(t, field, data[field].strip())

    if "due_date" in data:
        val = (data.get("due_date") or "").strip()
        if val:
            try:
                t.due_date = date.fromisoformat(val)
            except ValueError:
                return jsonify({"ok": False, "error": "due_date must be YYYY-MM-DD"}), 422
        else:
            t.due_date = None

    db.session.commit()
    return jsonify({"ok": True, "item": t.to_dict()}), 200

@workflows_bp.delete("/tasks/<int:task_id>")
@jwt_required()
def delete_task(task_id):
    user = _current_user()
    if not user:
        return jsonify({"ok": False, "error": "Unauthorized"}), 401

    t = Task.query.get_or_404(task_id)
    if user.role != "admin" and t.workflow.user_id != user.id:
        return jsonify({"ok": False, "error": "Forbidden"}), 403

    db.session.delete(t)
    db.session.commit()
    return jsonify({"ok": True}), 200
