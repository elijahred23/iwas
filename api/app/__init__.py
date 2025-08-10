from flask import Flask, request
from flask_cors import CORS
from .config import Config
from .extensions import db, jwt
from .auth.routes import auth_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # extensions
    db.init_app(app)
    jwt.init_app(app)

    # CORS (still keep this — the after_request is just a safety net)
    CORS(
        app,
        resources={r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"]
        }},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    # api/app/__init__.py (inside create_app, before return)
    @app.get("/api/ping")
    def ping():
        return {"ok": True, "service": "api"}


    # ✅ after_request goes here (applies to every response, incl. OPTIONS)
    @app.after_request
    def add_cors_headers(resp):
        # Echo back the dev origin if it’s one we allow
        allowed = {"http://localhost:5173", "http://127.0.0.1:5173"}
        origin = request.headers.get("Origin")
        if origin in allowed:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
        # Credentials + common headers/methods
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return resp

    with app.app_context():
        db.create_all()

    return app
