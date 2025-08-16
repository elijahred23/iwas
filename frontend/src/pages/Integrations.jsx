import { useEffect, useMemo, useState } from 'react';
import Section from './_scaffold.jsx';
import { IntegrationsAPI } from '../lib/integrations';

const TABS = ['slack', 'github', 'jira'];

export default function Integrations() {
  const initialTab = useMemo(() => {
    const h = (typeof window !== 'undefined' && window.location.hash || '').replace('#', '').toLowerCase();
    return TABS.includes(h) ? h : (localStorage.getItem('integrations.activeTab') || 'slack');
  }, []);
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : 'slack');

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace('#', '').toLowerCase();
      if (TABS.includes(h)) setTab(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('integrations.activeTab', tab); } catch {}
    if (window.location.hash.replace('#','') !== tab) {
      history.replaceState(null, '', `#${tab}`);
    }
  }, [tab]);

  // ================== Slack ==================
  const [slackUrl, setSlackUrl] = useState('');
  const [slackMsg, setSlackMsg] = useState('');
  async function saveSlack(e) {
    e.preventDefault();
    setSlackMsg('');
    try {
      await IntegrationsAPI.saveSlack(slackUrl.trim());
      setSlackMsg('Saved ✅');
    } catch (e) {
      setSlackMsg(e?.response?.data?.error || 'Save failed');
    }
  }
  async function testSlack() {
    setSlackMsg('');
    try {
      await IntegrationsAPI.testSlack();
      setSlackMsg('Test sent ✅ Check Slack.');
    } catch (e) {
      setSlackMsg(e?.response?.data?.error || 'Test failed');
    }
  }

  // ================== GitHub ==================
  const [ghBase, setGhBase] = useState('https://api.github.com');
  const [ghToken, setGhToken] = useState('');
  const [ghDefaultRepo, setGhDefaultRepo] = useState('');
  const [ghMsg, setGhMsg] = useState('');
  const [repos, setRepos] = useState([]);
  const [newIssueRepo, setNewIssueRepo] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');

  async function saveGitHub(e) {
    e.preventDefault();
    setGhMsg('');
    try {
      await IntegrationsAPI.saveGitHub({
        api_base: ghBase.trim(),
        token: ghToken.trim(),
        default_repo: ghDefaultRepo.trim() || null
      });
      setGhMsg('Saved ✅');
    } catch (e) {
      setGhMsg(e?.response?.data?.error || 'Save failed');
    }
  }
  async function testGitHub() {
    setGhMsg('');
    try {
      const r = await IntegrationsAPI.testGitHub();
      setGhMsg(`OK as ${r.user?.login || r.user?.name || 'user'} ✅`);
    } catch (e) {
      setGhMsg(e?.response?.data?.error || 'Test failed');
    }
  }
  async function loadRepos() {
    setGhMsg('');
    try {
      const r = await IntegrationsAPI.listRepos();
      setRepos(r.items || []);
      setGhMsg(`Loaded ${r.items?.length || 0} repos ✅`);
    } catch (e) {
      setGhMsg(e?.response?.data?.error || 'Failed to load repos');
    }
  }
  async function createGhIssue(e) {
    e.preventDefault();
    setGhMsg('');
    try {
      const r = await IntegrationsAPI.createGitHubIssue(newIssueRepo, {
        title: issueTitle,
        description: issueDesc
      });
      setGhMsg(`Issue #${r.issue?.number} created ✅`);
      setIssueTitle(''); setIssueDesc('');
    } catch (e) {
      setGhMsg(e?.response?.data?.error || 'Create failed');
    }
  }

  // ================== Jira ==================
  const [jiraBase, setJiraBase] = useState('https://your-domain.atlassian.net');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraDefaultProject, setJiraDefaultProject] = useState('');
  const [jiraMsg, setJiraMsg] = useState('');
  const [jiraProjects, setJiraProjects] = useState([]);
  const [jiraSearch, setJiraSearch] = useState('');
  const [jiraIssueProject, setJiraIssueProject] = useState('');
  const [jiraSummary, setJiraSummary] = useState('');
  const [jiraDescription, setJiraDescription] = useState('');
  const [jiraType, setJiraType] = useState('Task');

  async function saveJira(e) {
    e.preventDefault();
    setJiraMsg('');
    try {
      await IntegrationsAPI.saveJira({
        base_url: jiraBase.trim(),
        email: jiraEmail.trim(),
        api_token: jiraToken.trim(),
        default_project: jiraDefaultProject.trim() || null,
      });
      setJiraMsg('Saved ✅');
    } catch (e) {
      setJiraMsg(e?.response?.data?.error || 'Save failed');
    }
  }
  async function testJira() {
    setJiraMsg('');
    try {
      const r = await IntegrationsAPI.testJira();
      setJiraMsg(`OK ✅ ${r.result?.projects_seen || 0} projects visible`);
    } catch (e) {
      setJiraMsg(e?.response?.data?.error || 'Test failed');
    }
  }
  async function loadJiraProjects() {
    setJiraMsg('');
    try {
      const r = await IntegrationsAPI.listJiraProjects(jiraSearch.trim());
      setJiraProjects(r.items || []);
      setJiraMsg(`Loaded ${r.items?.length || 0} projects ✅`);
    } catch (e) {
      setJiraMsg(e?.response?.data?.error || 'Failed to load projects');
    }
  }
  async function createJiraIssue(e) {
    e.preventDefault();
    setJiraMsg('');
    try {
      const r = await IntegrationsAPI.createJiraIssue({
        project_key: jiraIssueProject.trim() || undefined,
        summary: jiraSummary,
        description: jiraDescription || undefined,
        issuetype: jiraType || 'Task',
      });
      setJiraMsg(`Issue ${r.issue?.key || r.issue?.id} created ✅`);
      setJiraSummary(''); setJiraDescription('');
    } catch (e) {
      setJiraMsg(e?.response?.data?.error || 'Create failed');
    }
  }

  // ---------- UI ----------
  return (
    <Section title="Integrations" subtitle="Connect Slack, GitHub, and Jira">
      {/* tabs */}
      <div style={{ marginBottom: 12 }}>
        <nav
          aria-label="Integrations tabs"
          role="tablist"
          style={{
            display: 'flex',
            gap: 8,
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: 6,
          }}
        >
          {TABS.map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              id={`tab-${t}`}
              onClick={() => setTab(t)}
              className="btn-ghost"
              style={{
                borderRadius: 8,
                padding: '8px 12px',
                ...(tab === t ? { background: '#f1f5f9', fontWeight: 600 } : null),
              }}
            >
              {t === 'slack' && 'Slack'}
              {t === 'github' && 'GitHub'}
              {t === 'jira' && 'Jira'}
            </button>
          ))}
        </nav>
      </div>

      {/* Slack Panel */}
      {tab === 'slack' && (
        <div
          role="tabpanel"
          id="panel-slack"
          aria-labelledby="tab-slack"
          className="page-card"
          style={{ padding: 16, borderRadius: 8 }}
        >
          <h3 style={{ marginTop: 0 }}>Slack</h3>
          <form onSubmit={saveSlack} style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
            <input
              placeholder="Incoming Webhook URL"
              value={slackUrl}
              onChange={e => setSlackUrl(e.target.value)}
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">Save</button>
              <button type="button" onClick={testSlack}>Send test</button>
            </div>
          </form>
          {slackMsg && <div style={{ marginTop: 8 }}>{slackMsg}</div>}
        </div>
      )}

      {/* GitHub Panel */}
      {tab === 'github' && (
        <div
          role="tabpanel"
          id="panel-github"
          aria-labelledby="tab-github"
          className="page-card"
          style={{ padding: 16, borderRadius: 8 }}
        >
          <h3 style={{ marginTop: 0 }}>GitHub</h3>
          <form onSubmit={saveGitHub} style={{ display: 'grid', gap: 8, maxWidth: 640 }}>
            <input placeholder="API base (optional)" value={ghBase} onChange={e=>setGhBase(e.target.value)} />
            <input placeholder="Default repo (owner/name) — optional" value={ghDefaultRepo} onChange={e=>setGhDefaultRepo(e.target.value)} />
            <input type="password" placeholder="Personal access token" value={ghToken} onChange={e=>setGhToken(e.target.value)} />
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button type="submit">Save</button>
              <button type="button" onClick={testGitHub}>Test token</button>
              <button type="button" onClick={loadRepos}>List repos</button>
            </div>
          </form>

          {ghMsg && <div style={{ marginTop:8 }}>{ghMsg}</div>}

          {repos.length > 0 && (
            <div style={{ marginTop:12 }}>
              <div style={{ display:'grid', gap:8, gridTemplateColumns:'2fr 1fr' }}>
                <select value={newIssueRepo} onChange={e=>setNewIssueRepo(e.target.value)}>
                  <option value="">Choose repo</option>
                  {repos.map(r => (
                    <option key={r.id} value={r.full_name}>{r.full_name}</option>
                  ))}
                </select>
                <div />
              </div>
              <form onSubmit={createGhIssue} style={{ display:'grid', gap:8, marginTop:8 }}>
                <input placeholder="Issue title" value={issueTitle} onChange={e=>setIssueTitle(e.target.value)} required />
                <textarea placeholder="Description (optional)" value={issueDesc} onChange={e=>setIssueDesc(e.target.value)} rows={3} />
                <button type="submit" disabled={!newIssueRepo || !issueTitle}>Create GitHub issue</button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Jira Panel */}
      {tab === 'jira' && (
        <div
          role="tabpanel"
          id="panel-jira"
          aria-labelledby="tab-jira"
          className="page-card"
          style={{ padding: 16, borderRadius: 8 }}
        >
          <h3 style={{ marginTop: 0 }}>Jira (Cloud)</h3>

          <form onSubmit={saveJira} style={{ display:'grid', gap:8, maxWidth:640 }}>
            <input placeholder="Base URL (e.g., https://your-domain.atlassian.net)" value={jiraBase} onChange={e=>setJiraBase(e.target.value)} />
            <input placeholder="Account email" value={jiraEmail} onChange={e=>setJiraEmail(e.target.value)} />
            <input type="password" placeholder="API token" value={jiraToken} onChange={e=>setJiraToken(e.target.value)} />
            <input placeholder="Default project key (optional, e.g., ENG)" value={jiraDefaultProject} onChange={e=>setJiraDefaultProject(e.target.value)} />
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button type="submit">Save</button>
              <button type="button" onClick={testJira}>Test</button>
            </div>
          </form>

          {jiraMsg && <div style={{ marginTop:8 }}>{jiraMsg}</div>}

          <div style={{ marginTop:12 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input
                placeholder="Search projects…"
                value={jiraSearch}
                onChange={e=>setJiraSearch(e.target.value)}
                style={{ flex:1 }}
              />
              <button type="button" onClick={loadJiraProjects}>Search</button>
            </div>
            {jiraProjects.length > 0 && (
              <div style={{ marginTop:8 }}>
                <select value={jiraIssueProject} onChange={e=>setJiraIssueProject(e.target.value)}>
                  <option value="">(Use default project)</option>
                  {jiraProjects.map(p => (
                    <option key={p.id} value={p.key}>{p.key} — {p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <form onSubmit={createJiraIssue} style={{ display:'grid', gap:8, marginTop:12, maxWidth:640 }}>
            <input placeholder="Summary" value={jiraSummary} onChange={e=>setJiraSummary(e.target.value)} required />
            <textarea placeholder="Description (optional)" value={jiraDescription} onChange={e=>setJiraDescription(e.target.value)} rows={3} />
            <input placeholder='Issue type (e.g., "Task", "Bug")' value={jiraType} onChange={e=>setJiraType(e.target.value)} />
            <button type="submit" disabled={!jiraSummary}>Create Jira issue</button>
          </form>
        </div>
      )}
    </Section>
  );
}
