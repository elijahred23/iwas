from flask import Flask, request
from flask_cors import CORS
from .config import Config
from .extensions import db, jwt
from .auth.routes import auth_bp
from .workflows.routes import workflows_bp
from .integrations.routes import integrations_bp
from .integrations.jira import jira_bp
from .analytics.routes import analytics_bp
from .logs.routes import logs_bp
from .tasks.routes import tasks_bp
from .notifications.routes import notifications_bp  


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # extensions
    db.init_app(app)
    jwt.init_app(app)

    # CORS (allow all origins; credentials are still supported for JWT cookies)
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(workflows_bp, url_prefix="/api/workflows")
    app.register_blueprint(integrations_bp, url_prefix="/api/integrations")
    app.register_blueprint(jira_bp, url_prefix="/api/integrations")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(logs_bp, url_prefix="/api/logs")
    app.register_blueprint(tasks_bp, url_prefix="/api/tasks")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")

    # api/app/__init__.py (inside create_app, before return)
    @app.get("/api/ping")
    def ping():
        return {"ok": True, "service": "api"}


    @app.after_request
    def add_cors_headers(resp):
        origin = request.headers.get("Origin")
        if origin:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRF-Token, X-Requested-With"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return resp


    with app.app_context():
        db.create_all()

    return app
