# **IWAS – Intelligent Workflow Automation System**

IWAS is a full-stack workflow automation platform built with a React/Vite frontend, a Flask API, and a fully automated DevOps pipeline powered by Docker, GitHub Actions, and DigitalOcean Kubernetes. The UI is responsive, light-themed, and ships integrations for Slack, GitHub, and Jira.

---

## **Frontend overview**
- React + Vite, React Router, and an AuthProvider for session/role gating.
- Axios client in `src/lib/api.js` uses a same-origin `/api` base in production; set `VITE_API_URL` in `.env.*` to override.
- Feature pages: Dashboard (analytics + activity), Workflows (CRUD + rules), Tasks, Reports, Integrations (Slack/GitHub/Jira), Notifications, Logs, Settings.
- Styling/theme lives in `src/index.css`; layout shell in `src/components/Layout.jsx`.

---

## **Local and Production Environments**

- Local: `npm install` then `npm run dev` (defaults to `http://localhost:5173`). For a full stack, use `docker-compose` from repo root.
- Prod: built via GitHub Actions, deployed to DigitalOcean Kubernetes with ingress + TLS. Managed MySQL handles automated backups.

---

## **CI/CD Automation**

The CI/CD pipeline in `.github/workflows/main.yml` automates building, testing, packaging, and deploying the application. Every push to `main` triggers linting and tests, then builds Docker images for both the API and frontend. GitHub Actions tags the images with both `latest` and the commit SHA before pushing them to Docker Hub. Afterward, the workflow authenticates to DigitalOcean using `doctl`, updates the Kubernetes context, and performs rolling updates via `kubectl set image`, ensuring the cluster pulls the newest images with no downtime. Every commit becomes a clean, fully redeployed version of IWAS.

---

## **Summary**

IWAS integrates full-stack development with modern DevOps practices. The project combines clean application architecture, declarative infrastructure, and continuous delivery so environments remain reproducible, configuration stays centralized, and deployments happen reliably on every commit.


