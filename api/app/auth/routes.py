# api/app/auth/routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
    jwt_required,
    get_jwt_identity,
)
from sqlalchemy import func
from ..extensions import db
from ..models import User
from werkzeug.security import generate_password_hash

auth_bp = Blueprint("auth", __name__)


# ---- helpers ---------------------------------------------------------------

def _json_error(msg: str, code: int):
    return jsonify({"ok": False, "error": msg}), code


def _current_user():
    """Resolve the current user from JWT 'sub' (stored as string)."""
    uid = get_jwt_identity()
    try:
        uid_int = int(uid)
    except (TypeError, ValueError):
        return None
    return User.query.get(uid_int)


# ---- routes ----------------------------------------------------------------

@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    uid = int(get_jwt_identity())
    user = User.query.get(uid)
    data = request.get_json(silent=True) or {}
    current = data.get("current_password") or ""
    new = data.get("new_password") or ""
    if not (current and new):
        return jsonify({"ok": False, "error": "current_password and new_password are required"}), 422
    if not user.check_password(current):
        return jsonify({"ok": False, "error": "Current password is incorrect"}), 400
    if len(new) < 8:
        return jsonify({"ok": False, "error": "New password must be at least 8 characters"}), 422
    user.password_hash = generate_password_hash(new, method="scrypt")
    db.session.commit()
    return jsonify({"ok": True})

@auth_bp.route("/login", methods=["OPTIONS"])
def login_options():
    # For CORS preflight convenience; CORS middleware will add headers.
    return ("", 204)


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return _json_error("email and password are required", 422)

    # Case-insensitive match
    user = User.query.filter(func.lower(User.email) == email).first()

    if not user or not user.check_password(password):
        return _json_error("Invalid credentials", 401)

    # NOTE: identity must be a string to satisfy JWT "sub" requirements
    access = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    refresh = create_refresh_token(identity=str(user.id))

    resp = jsonify({"ok": True, "user": user.to_public()})
    set_access_cookies(resp, access)     # sets HttpOnly access cookie (+ csrf cookie if enabled)
    set_refresh_cookies(resp, refresh)   # sets HttpOnly refresh cookie (+ csrf cookie if enabled)
    return resp, 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user = _current_user()
    if not user:
        return _json_error("Unauthorized", 401)

    new_access = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    resp = jsonify({"ok": True})
    set_access_cookies(resp, new_access)
    return resp, 200


@auth_bp.get("/me")
@jwt_required()
def me():
    user = _current_user()
    if not user:
        return _json_error("User not found", 404)
    return jsonify({"ok": True, "user": user.to_public()}), 200


@auth_bp.post("/logout")
def logout():
    # Clears both access and refresh cookies
    resp = jsonify({"ok": True})
    unset_jwt_cookies(resp)
    return resp, 200


@auth_bp.get("/users")
@jwt_required()
def list_users():
    user = _current_user()
    if not user or user.role != "admin":
        return _json_error("Forbidden", 403)

    users = User.query.order_by(User.id.asc()).all()
    return jsonify({
        "ok": True,
        "count": len(users),
        "users": [u.to_public() for u in users]
    }), 200
