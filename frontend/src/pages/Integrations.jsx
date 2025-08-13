import { useState } from 'react';
import Section from './_scaffold.jsx';
import { api } from '../lib/api.js';

export default function Integrations() {
  // ---------------------
  // Slack
  // ---------------------
  const [slackWebhook, setSlackWebhook] = useState('');
  const [slackMsg, setSlackMsg] = useState('');
  const [slackBusy, setSlackBusy] = useState(false);

  async function saveSlack(e) {
    e.preventDefault();
    setSlackMsg('');
    setSlackBusy(true);
    try {
      await api.post('/integrations/slack', { webhook_url: slackWebhook.trim() });
      setSlackMsg('Slack webhook saved.');
      setSlackWebhook('');
    } catch (err) {
      setSlackMsg(err?.response?.data?.error || 'Save failed');
    } finally {
      setSlackBusy(false);
    }
  }

  async function testSlack() {
    setSlackMsg('');
    setSlackBusy(true);
    try {
      const r = await api.post('/integrations/slack/test'); // expects 200/ok from API
      setSlackMsg(r.data?.ok ? 'Test message sent to Slack.' : 'Not configured.');
    } catch (err) {
      setSlackMsg(err?.response?.data?.error || 'Test failed');
    } finally {
      setSlackBusy(false);
    }
  }

  async function sendExampleSlack() {
    setSlackMsg('');
    setSlackBusy(true);
    try {
      const r = await api.post('/integrations/slack/example', {
        text: 'Hello from IWAS — example notification!',
      });
      setSlackMsg(r.data?.ok ? 'Example notification sent.' : 'Send failed.');
    } catch (err) {
      setSlackMsg(err?.response?.data?.error || 'Send failed');
    } finally {
      setSlackBusy(false);
    }
  }

  // ---------------------
  // GitHub
  // ---------------------
  const [apiBase, setApiBase] = useState('https://api.github.com'); // For GHE: https://ghe.company.com/api/v3
  const [token, setToken] = useState('');
  const [defaultRepo, setDefaultRepo] = useState(''); // owner/repo (optional)
  const [ghMsg, setGhMsg] = useState('');
  const [ghBusy, setGhBusy] = useState(false);
  const [repos, setRepos] = useState([]);
  const [chosen, setChosen] = useState(''); // owner/repo

  async function saveGitHub(e) {
    e.preventDefault();
    setGhMsg('');
    setGhBusy(true);
    try {
      await api.post('/integrations/github', {
        api_base: apiBase.trim(),
        token: token.trim(),
        default_repo: defaultRepo.trim() || undefined,
      });
      setGhMsg('GitHub settings saved. You can Test or Load repos.');
      setToken(''); // don’t keep token in memory
    } catch (err) {
      setGhMsg(err?.response?.data?.error || 'Save failed');
    } finally {
      setGhBusy(false);
    }
  }

  async function testGitHub() {
    setGhMsg('');
    setGhBusy(true);
    try {
      const r = await api.post('/integrations/github/test');
      if (r.data?.ok) {
        const u = r.data.user;
        setGhMsg(`Token OK — ${u.login}${u.name ? ` (${u.name})` : ''}`);
      } else {
        setGhMsg('Not configured.');
      }
    } catch (err) {
      setGhMsg(err?.response?.data?.error || 'Test failed');
    } finally {
      setGhBusy(false);
    }
  }

  async function loadRepos() {
    setGhMsg('');
    setGhBusy(true);
    try {
      const r = await api.get('/integrations/github/repos');
      const list = r.data?.items || [];
      setRepos(list);
      if (!list.length) setGhMsg('No repos found.');
    } catch (err) {
      setGhMsg(err?.response?.data?.error || 'Load failed');
    } finally {
      setGhBusy(false);
    }
  }

  async function createTestIssue() {
    const repoFull = chosen || defaultRepo;
    if (!repoFull) {
      setGhMsg('Pick a repo from the list or set Default repo.');
      return;
    }
    const [owner, repo] = repoFull.split('/');
    if (!owner || !repo) {
      setGhMsg('Repo must be in the format owner/repo');
      return;
    }

    setGhMsg('');
    setGhBusy(true);
    try {
      const r = await api.post(`/integrations/github/repos/${owner}/${repo}/issues`, {
        title: 'Hello from IWAS',
        description: 'This issue was created via IWAS GitHub integration.',
      });
      if (r.data?.ok) {
        setGhMsg(`Issue created: ${r.data.issue.title} — ${r.data.issue.html_url}`);
      } else {
        setGhMsg('Create issue failed.');
      }
    } catch (err) {
      setGhMsg(err?.response?.data?.error || 'Create issue failed');
    } finally {
      setGhBusy(false);
    }
  }

  return (
    <Section title="Integrations" subtitle="Connect your favorite apps and services">
      {/* Slack */}
      <div className="page-card" style={{ padding: 16, borderRadius: 8, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Slack</h3>
        <p style={{ color: '#555' }}>
          Paste an <strong>Incoming Webhook URL</strong> from your Slack workspace.
        </p>

        <form onSubmit={saveSlack} style={{ display: 'grid', gap: 8, maxWidth: 720 }}>
          <input
            type="url"
            placeholder="Slack webhook URL"
            value={slackWebhook}
            onChange={(e) => setSlackWebhook(e.target.value)}
            required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" disabled={slackBusy || !slackWebhook.trim()}>
              {slackBusy ? 'Saving…' : 'Save Slack'}
            </button>
            <button type="button" onClick={testSlack} disabled={slackBusy}>
              {slackBusy ? 'Testing…' : 'Test ping'}
            </button>
            <button type="button" onClick={sendExampleSlack} disabled={slackBusy}>
              {slackBusy ? 'Sending…' : 'Send example message'}
            </button>
          </div>
        </form>

        {slackMsg && <div style={{ marginTop: 10 }}>{slackMsg}</div>}
      </div>

      {/* GitHub */}
      <div className="page-card" style={{ padding: 16, borderRadius: 8, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>GitHub</h3>
        <p style={{ color: '#555' }}>
          Use a <strong>Personal Access Token (PAT)</strong>. For private repos, grant{' '}
          <code>repo</code> scope (classic) or a fine-grained PAT with <em>Issues: Read and write</em>.
        </p>

        <form onSubmit={saveGitHub} style={{ display: 'grid', gap: 8, maxWidth: 720 }}>
          <input
            type="url"
            placeholder="API base (GitHub.com default: https://api.github.com)"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <input
            type="password"
            placeholder="Personal Access Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="new-password"
            required
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <input
            placeholder="Default repo (owner/repo, optional)"
            value={defaultRepo}
            onChange={(e) => setDefaultRepo(e.target.value)}
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" disabled={ghBusy || !token.trim()}>
              {ghBusy ? 'Saving…' : 'Save GitHub'}
            </button>
            <button type="button" onClick={testGitHub} disabled={ghBusy}>
              {ghBusy ? 'Testing…' : 'Test token'}
            </button>
            <button type="button" onClick={loadRepos} disabled={ghBusy}>
              {ghBusy ? 'Loading…' : 'Load my repos'}
            </button>
          </div>
        </form>

        {!!repos.length && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={chosen}
              onChange={(e) => setChosen(e.target.value)}
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6, minWidth: 320 }}
            >
              <option value="">— Select a repository —</option>
              {repos.map((r) => (
                <option key={r.id} value={r.full_name}>
                  {r.full_name}{r.private ? ' (private)' : ''}
                </option>
              ))}
            </select>
            <button type="button" onClick={createTestIssue} disabled={ghBusy}>
              {ghBusy ? 'Creating…' : 'Create test issue'}
            </button>
          </div>
        )}

        {ghMsg && <div style={{ marginTop: 10 }}>{ghMsg}</div>}
      </div>
    </Section>
  );
}
