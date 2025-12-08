# **IWAS – Intelligent Workflow Automation System**

IWAS is a full-stack workflow automation platform built with a React/Vite frontend, a Flask API, and a fully automated DevOps pipeline powered by Docker, GitHub Actions, and DigitalOcean Kubernetes. The project cleanly separates the client, server, and infrastructure layers while keeping deployment and configuration consistent across environments.

---

## **Overview**

The API lives in `api/app`, where `config.py` defines environment-specific settings and `extensions.py` initializes services such as SQLAlchemy, JWT authentication, and other shared components. The domain is modeled in `models.py`, which defines Users, Workflows, Tasks, Logs, and Integrations. Features are organized as Flask blueprints: authentication uses HttpOnly JWT cookies, workflows and tasks support CRUD operations with audit logging and Slack notifications, analytics exposes dashboard and activity data, and integration clients support Slack, GitHub, and Jira actions. Alembic migrations are tracked under `api/migrations`, and database schema and seeds are in `infra/db/sql`.

The frontend in `frontend/src` is built with React, React Router, and an AuthProvider for state management. Axios wrappers in `lib/` unify all server communication, and UI components such as Layout, WorkflowSetup, TaskList, Analytics, Integrations, Notifications, and Settings form the core user interface. Styling is kept intentionally semantic for maintainability.

---

## **Local and Production Environments**

Local development uses Docker Compose to start the full stack with one command.  
Production relies on Kubernetes manifests in `infra/k8s`, defining deployments, services, secrets, config maps, and ingress routing so the system runs reliably in DigitalOcean Kubernetes.

**Managed MySQL (DigitalOcean)**  
Add the managed DB secret `infra/k8s/iwas-db-secret.yaml` (contains `DATABASE_URL` for the DO MySQL instance with SSL) and apply it before deploying the API: `kubectl apply -f infra/k8s/iwas-db-secret.yaml`. The API deployment pulls this secret via `envFrom`.

---

## **CI/CD Automation**

The CI/CD pipeline in `.github/workflows/main.yml` automates building, testing, packaging, and deploying the application. Every push to `main` triggers linting and tests, then builds Docker images for both the API and frontend. GitHub Actions tags the images with both `latest` and the commit SHA before pushing them to Docker Hub. Afterward, the workflow authenticates to DigitalOcean using `doctl`, updates the Kubernetes context, and performs rolling updates via `kubectl set image`, ensuring the cluster pulls the newest images with no downtime. Every commit becomes a clean, fully redeployed version of IWAS.

---

## **Summary**

IWAS integrates full-stack development with modern DevOps practices. The project combines clean application architecture, declarative infrastructure, and continuous delivery so environments remain reproducible, configuration stays centralized, and deployments happen reliably on every commit.

---
## **Capstone Requirements**

Author: Elijah Proctor  
Instructor: Professor Mujeye  
Program: Master of Science in Software Engineering, Grand Canyon University

### Functional Requirements (User Stories US-001 → US-010)
- **US-001** As a project manager, I would like to streamline the delivery of tasks so that everyone can do their job well.
- **US-002** As a developer, I desire real-time notifications in Slack whenever a Jira ticket undergoes changes so that I can keep up with project progress.
- **US-003** As an administrator, I need to configure and handle API integrations so Jira, Slack, and GitHub all work together with IWAS without issues.
- **US-004** As the team leader, I require real-time analytics to monitor task performance and make informed, data-driven decisions.
- **US-005** As a user, I want to set up my own workflow rules so that certain jobs are done automatically when specific conditions are met.
- **US-006** As a project manager, I want to track overdue and completed tasks to monitor project growth and productivity.
- **US-007** As an administrator, I want to set up RBAC so that only authorized users can modify workflow settings.
- **US-008** As a system supervisor, I want to track and log workflow execution so I can identify problems and ensure accountability.
- **US-009** As a developer, I desire immediate updates to GitHub to streamline deployment.
- **US-010** As a user, I want to be automatically notified if a task errors so that I can fix it immediately.

### Non-Functional Requirements (User Stories NFR-001 → NFR-010)
- **NFR-001** The system must maintain at least 99% uptime so automation runs reliably.
- **NFR-002** All API calls must be encrypted with HTTPS and secure tokens to ensure confidentiality.
- **NFR-003** IWAS must handle at least 10,000 API calls per day for large-scale automation.
- **NFR-004** Tasks must complete in two seconds or less to avoid user wait time.
- **NFR-005** RBAC shall restrict user permissions so only authorized users can modify workflows.
- **NFR-006** All failed login attempts must be logged for security auditing.
- **NFR-007** The system must maintain detailed failure logs and debugging information to help developers fix issues quickly.
- **NFR-008** The system must run on a Kubernetes cluster and support automatic scaling based on workload.
- **NFR-009** The system must run automated tests before deployment to detect issues early.
- **NFR-010** Daily MySQL backups must be generated to prevent data loss.

### Technical Requirements (technologies/tools)
- Python (Flask) – API server, workflows, integrations
- React JS – Frontend framework
- MySQL – Database
- DigitalOcean Kubernetes – Deployment and scaling
- Docker – Containerization
- Slack API – Real-time messaging/notifications
- Jira API – Task and workflow integration
- GitHub API – Repository and commit automation
- OAuth 2.0 – Authentication and authorization
- JSON Web Tokens (JWT) – Secure authentication tokens

### Logical System Design (high level)
- React UI communicates with Flask API Gateway.
- Security layer enforces OAuth2.0-style auth and RBAC before routing to services.
- Workflow Engine coordinates automation and triggers integrations (Jira/Slack/GitHub).
- MySQL stores workflow/task data; Logging & Monitoring capture events for observability.

### User Interface Design
- Sitemap ensures fast access to Workflow Configuration, Task Management, Analytics, Integrations, Reports, Notifications, and Settings.
- Wireframes emphasize clear navigation, consistent patterns, and streamlined flows that reduce user effort.
- Responsive layout tuned for desktop and mobile with light-themed styling.

### Functional Acceptance Tests (E2E)
- Lightweight end-to-end checks for notifications, Slack alerts, and GitHub auto-updates live in `api/tests/e2e/test_integrations.py`.
- Required env: `IWAS_BASE_URL` (e.g., http://localhost:5050) and `IWAS_JWT` (Bearer token).
- Optional env to exercise integrations: `IWAS_SLACK_WEBHOOK`, `IWAS_GH_TOKEN`, `IWAS_GH_REPO` (owner/name).
- Run locally: `cd api && python -m unittest discover -s tests/e2e`.
