from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db
from sqlalchemy import func


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
    workflow_id = db.Column(db.Integer, db.ForeignKey("workflows.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50))
    assigned_to = db.Column(db.String(100))
    due_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, server_default=func.current_timestamp())

    workflow = db.relationship("Workflow", backref=db.backref("tasks", lazy="dynamic", cascade="all,delete"))

    def to_dict(self):
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "name": self.name,
            "status": self.status,
            "assigned_to": self.assigned_to,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "created_at": self.created_at.isoformat(sep=" ", timespec="seconds") if self.created_at else None,
        }

    # optional alias if you already use to_public() elsewhere
    def to_public(self):
        return self.to_dict()