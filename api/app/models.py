from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db
from sqlalchemy import func
from cryptography.fernet import Fernet, InvalidToken
import os, json


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw: str):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password_hash, raw)

    def to_public(self):
        return {"id": self.id, "name": self.name, "email": self.email, "role": self.role}

class Workflow(db.Model):
    __tablename__ = "workflows"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    owner = db.relationship(
        "User",
        backref=db.backref("workflows", lazy="dynamic")
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
class Task(db.Model):
    __tablename__ = "tasks"
    id = db.Column(db.Integer, primary_key=True)
    workflow_id = db.Column(db.Integer, db.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50))
    assigned_to = db.Column(db.String(100))
    due_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    workflow = db.relationship("Workflow", backref=db.backref("tasks", cascade="all, delete-orphan"))
    logs = db.relationship("Log", back_populates="task", cascade="all, delete-orphan")

    def to_public(self):
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "name": self.name,
            "status": self.status,
            "assigned_to": self.assigned_to,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    # back-compat alias
    def to_dict(self):
        return self.to_public()

class Log(db.Model):
    __tablename__ = "logs"
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.current_timestamp())
    event = db.Column(db.Text)
    status = db.Column(db.String(50))

    task = db.relationship("Task", back_populates="logs")

    def to_public(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "event": self.event,
            "status": self.status,
        }

class WorkflowRule(db.Model):
    __tablename__ = "workflow_rules"

    id = db.Column(db.Integer, primary_key=True)
    workflow_id = db.Column(db.Integer, db.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    when_status = db.Column(db.String(50))
    when_name_contains = db.Column(db.String(120))
    action_type = db.Column(db.String(50), nullable=False)  # set_status | assign_to | notify_slack
    action_value = db.Column(db.Text)  # status value, assignee, or slack message
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())

    workflow = db.relationship("Workflow", backref=db.backref("rules", cascade="all, delete-orphan"))

    def to_public(self):
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "name": self.name,
            "when_status": self.when_status,
            "when_name_contains": self.when_name_contains,
            "action_type": self.action_type,
            "action_value": self.action_value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
def _fernet():
    key = os.environ.get("INTEGRATION_KEY")
    if not key:
        raise RuntimeError("INTEGRATION_KEY is not set")
    # Accept either str or bytes; Fernet wants bytes
    return Fernet(key.encode() if isinstance(key, str) else key)

class Integration(db.Model):
    __tablename__ = "integrations"

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)   # e.g. "slack"
    credentials = db.Column(db.Text, nullable=False)  # encrypted blob
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    user = db.relationship(
        "User",
        backref=db.backref("integrations", lazy="dynamic", cascade="all, delete-orphan")
    )

    # ---------- helpers ----------
    def to_public(self):
        return {"id": self.id, "type": self.type, "user_id": self.user_id}

    def _safe_credentials(self) -> dict:
        try:
            return json.loads(self.credentials or "{}")
        except Exception:
            return {}
    def set_secret(self, payload: dict):
        """Encrypt and store arbitrary JSON credentials."""
        token = _fernet().encrypt(json.dumps(payload).encode()).decode()
        self.credentials = token

    def get_secret(self) -> dict | None:
        """Decrypt credentials; returns dict or None if unreadable."""
        try:
            data = _fernet().decrypt(self.credentials.encode())
            return json.loads(data.decode())
        except (InvalidToken, Exception):
            return None

    # Convenience for Slack
    def set_slack_webhook(self, url: str):
        self.type = "slack"
        self.set_secret({"webhook_url": url})

    def slack_webhook(self) -> str | None:
        data = self.get_secret() or {}
        return data.get("webhook_url")
    def set_github(self, api_base: str, token: str, default_repo: str | None = None):
        """
        api_base: 'https://api.github.com' (GitHub.com) OR 'https://ghe.yourco.com/api/v3' (GHE)
        default_repo: 'owner/repo' (optional)
        """
        data = self._safe_credentials()
        data["github"] = {
            "api_base": (api_base or "https://api.github.com").rstrip("/"),
            "token": (token or "").strip(),
            "default_repo": (default_repo or "").strip() or None,
        }
        self.credentials = json.dumps(data)

    def get_github(self) -> dict:
        data = self._safe_credentials()
        gh = data.get("github") or {}
        return {
            "api_base": (gh.get("api_base") or "https://api.github.com").rstrip("/"),
            "token": gh.get("token") or "",
            "default_repo": gh.get("default_repo"),
        }

    def to_public(self):
        data = self._safe_credentials()
        # redact GitHub token
        if "github" in data:
            gh = dict(data["github"])
            if "token" in gh:
                gh["token"] = "****"
            data["github"] = gh
        # (keep whatever redaction you already have for slack, etc.)
        return {
            "id": self.id,
            "type": self.type,
            "user_id": self.user_id,
            "data": data,
        }

    def set_jira_credentials(self, *, domain: str, email: str, api_token: str,
        default_project: str | None = None,
        default_issue_type: str | None = None) -> None:
        """
        domain: your-domain.atlassian.net  (no protocol, no trailing slash)
        email:  the Atlassian account email that owns the API token
        api_token: token created at https://id.atlassian.com/manage-profile/security/api-tokens
        """
        try:
            data = json.loads(self.credentials) if self.credentials else {}
        except Exception:
            data = {}

        data["jira"] = {
            "domain": domain.strip().removeprefix("https://").removeprefix("http://").rstrip("/"),
            "email": email.strip(),
            "api_token": api_token.strip(),
            "default_project": (default_project or "").strip() or None,
            "default_issue_type": (default_issue_type or "").strip() or None,
        }
        self.credentials = json.dumps(data)

    def get_jira_config(self) -> dict:
        try:
            data = json.loads(self.credentials) if self.credentials else {}
        except Exception:
            data = {}
        return data.get("jira") or {}
