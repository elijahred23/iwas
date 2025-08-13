# api/app/integrations/slack.py
import os, json, requests
from cryptography.fernet import Fernet
from ..extensions import db
from ..models import Integration

def _fernet():
    key = os.environ.get("INTEGRATION_KEY")
    if not key:
        raise RuntimeError("INTEGRATION_KEY env var is required")
    return Fernet(key.encode())

def save_slack_webhook(user_id: int, webhook_url: str) -> int:
    creds = {"webhook_url": webhook_url}
    blob = _fernet().encrypt(json.dumps(creds).encode()).decode()
    row = Integration.query.filter_by(user_id=user_id, type="slack").first()
    if not row:
        row = Integration(user_id=user_id, type="slack", credentials=blob)
        db.session.add(row)
    else:
        row.credentials = blob
    db.session.commit()
    return row.id

def get_slack_webhook(user_id: int) -> str | None:
    row = Integration.query.filter_by(user_id=user_id, type="slack").first()
    if not row:
        return None
    data = json.loads(_fernet().decrypt(row.credentials.encode()).decode())
    return data.get("webhook_url")

def send_slack(user_id: int, text: str) -> int | None:
    url = get_slack_webhook(user_id)
    if not url:
        return None
    r = requests.post(url, json={"text": text}, timeout=10)
    return r.status_code
