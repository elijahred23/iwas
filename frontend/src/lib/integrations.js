import { api } from './api';

export const IntegrationsAPI = {
  // ---- Slack ----
  saveSlack(webhook_url) {
    return api.post('/integrations/slack', { webhook_url }).then(r => r.data);
  },
  testSlack() {
    return api.post('/integrations/slack/test').then(r => r.data);
  },

  // ---- GitHub ----
  saveGitHub({ api_base = 'https://api.github.com', token, default_repo }) {
    return api.post('/integrations/github', { api_base, token, default_repo }).then(r => r.data);
  },
  testGitHub() {
    return api.post('/integrations/github/test').then(r => r.data);
  },
  listRepos() {
    return api.get('/integrations/github/repos').then(r => r.data);
  },
  createGitHubIssue(fullName, { title, description }) {
    const [owner, repo] = String(fullName || '').split('/');
    return api.post(`/integrations/github/repos/${owner}/${repo}/issues`, { title, description }).then(r => r.data);
  },

  // ---- Jira ----
  saveJira({ base_url, email, api_token, default_project }) {
    return api.post('/integrations/jira', { base_url, email, api_token, default_project }).then(r => r.data);
  },
  testJira(overrides = {}) {
    // overrides can include { base_url, email, api_token } to test without saving
    return api.post('/integrations/jira/test', overrides).then(r => r.data);
  },
  listJiraProjects(q = '') {
    return api.get('/integrations/jira/projects', { params: { q } }).then(r => r.data);
  },
  createJiraIssue({ project_key, summary, description, issuetype = 'Task' }) {
    if (project_key) {
      return api
        .post(`/integrations/jira/projects/${encodeURIComponent(project_key)}/issues`, {
          summary,
          description,
          issuetype,
        })
        .then(r => r.data);
    }
    // falls back to default_project stored on the server
    return api.post('/integrations/jira/issues', { summary, description, issuetype }).then(r => r.data);
  },
  jiraWebhookInfo() {
    return api.get('/integrations/jira/webhook/info').then(r => r.data);
  },
  rotateJiraWebhook() {
    return api.post('/integrations/jira/webhook/rotate').then(r => r.data);
  },
};
