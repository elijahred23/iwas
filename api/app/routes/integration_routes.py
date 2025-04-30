
from flask import Blueprint, request, jsonify
from app.integrations.jira_client import JiraClient
from app.integrations.github_client import GitHubClient
from app.integrations.slack_client import SlackClient
import os
from dotenv import load_dotenv

load_dotenv()

integration_bp = Blueprint("integration", __name__)

# --- JIRA Routes ---

@integration_bp.route("/jira/create-issue", methods=["POST"])
def create_jira_issue():
    data = request.json
    jira = JiraClient(
        base_url=os.getenv("JIRA_URL"),
        email=os.getenv("JIRA_EMAIL"),
        api_token=os.getenv("JIRA_API_TOKEN")
    )
    issue = jira.create_issue(
        project_key=data["project"],
        summary=data["summary"],
        description=data["description"],
        issue_type=data.get("issue_type", "Task")
    )
    return jsonify(issue)

@integration_bp.route("/jira/comment", methods=["POST"])
def add_jira_comment():
    data = request.json
    jira = JiraClient(
        base_url=os.getenv("JIRA_URL"),
        email=os.getenv("JIRA_EMAIL"),
        api_token=os.getenv("JIRA_API_TOKEN")
    )
    comment = jira.add_comment(issue_key=data["issue_key"], comment=data["comment"])
    return jsonify(comment)

# --- GitHub Routes ---

@integration_bp.route("/github/create-issue", methods=["POST"])
def create_github_issue():
    data = request.json
    github = GitHubClient(
        token=os.getenv("GITHUB_TOKEN"),
        owner=os.getenv("GITHUB_OWNER"),
        repo=os.getenv("GITHUB_REPO")
    )
    issue = github.create_issue(
        title=data["title"],
        body=data.get("body", ""),
        labels=data.get("labels", []),
        assignees=data.get("assignees", [])
    )
    return jsonify(issue)

@integration_bp.route("/github/create-pr", methods=["POST"])
def create_github_pr():
    data = request.json
    github = GitHubClient(
        token=os.getenv("GITHUB_TOKEN"),
        owner=os.getenv("GITHUB_OWNER"),
        repo=os.getenv("GITHUB_REPO")
    )
    pr = github.create_pull_request(
        title=data["title"],
        head=data["head"],
        base=data.get("base", "main"),
        body=data.get("body", "")
    )
    return jsonify(pr)

@integration_bp.route("/github/create-branch", methods=["POST"])
def create_github_branch():
    data = request.json
    github = GitHubClient(
        token=os.getenv("GITHUB_TOKEN"),
        owner=os.getenv("GITHUB_OWNER"),
        repo=os.getenv("GITHUB_REPO")
    )
    branch = github.create_branch(branch_name=data["branch_name"], source_branch=data.get("source_branch", "main"))
    return jsonify(branch)

# --- Slack Routes ---

@integration_bp.route("/slack/post", methods=["POST"])
def post_slack_message():
    data = request.json
    slack = SlackClient(token=os.getenv("SLACK_API_TOKEN"))
    result = slack.post_message(channel=data["channel"], text=data["text"])
    return jsonify(result)

@integration_bp.route("/slack/upload", methods=["POST"])
def upload_slack_file():
    slack = SlackClient(token=os.getenv("SLACK_API_TOKEN"))
    file = request.files["file"]
    file_path = f"/tmp/{file.filename}"
    file.save(file_path)
    result = slack.upload_file(
        channels=request.form.get("channels").split(","),
        file_path=file_path,
        title=request.form.get("title", file.filename)
    )
    return jsonify(result)
