from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, set_access_cookies, unset_jwt_cookies,
    jwt_required, get_jwt_identity
)
from ..extensions import db
from ..models import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["OPTIONS"])
def login_options():
    return ("", 204)

@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"ok": False, "error": "email and password are required"}), 422

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"ok": False, "error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    resp = jsonify({"ok": True, "user": user.to_public()})
    set_access_cookies(resp, access_token)  # HttpOnly cookie
    return resp, 200

@auth_bp.get("/me")
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"ok": False, "error": "User not found"}), 404
    return jsonify({"ok": True, "user": user.to_public()})

@auth_bp.post("/logout")
def logout():
    resp = jsonify({"ok": True})
    unset_jwt_cookies(resp)
    return resp, 200
