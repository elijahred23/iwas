// frontend/src/pages/Integrations.jsx
import { useState } from 'react';
import Section from './_scaffold.jsx';
import { api } from '../lib/api.js';

export default function Integrations() {
  const [webhook, setWebhook] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
      await api.post('/integrations/slack', { webhook_url: webhook.trim() });
      setMsg('Saved! Try “Send test” or create a workflow/task to see Slack messages.');
      setWebhook('');
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setMsg('');
    setBusy(true);
    try {
      const r = await api.post('/integrations/slack/test');
      setMsg(r.data?.ok ? 'Test sent to Slack ✅' : 'Slack is not configured yet.');
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Test failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Integrations" subtitle="Connect your favorite apps and services">
      <div className="page-card" style={{ padding: 16, borderRadius: 8, marginTop: 12 }}>
        <h3 style={{ marginTop: 0 }}>Slack</h3>
        <p style={{ color: '#555', marginTop: 4 }}>
          Paste an <strong>Incoming Webhook URL</strong> from Slack. We’ll use it to notify you when
          workflows and tasks are created or updated.
        </p>

        <form onSubmit={save} style={{ display: 'grid', gap: 8, maxWidth: 700 }}>
          <input
            type="url"
            placeholder="https://hooks.slack.com/services/XXXXX/XXXXX/XXXXXXXX"
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            required
            pattern="https://hooks\.slack\.com/.*"
            style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={busy || !webhook.trim()}>
              {busy ? 'Saving…' : 'Save Webhook'}
            </button>
            <button type="button" onClick={sendTest} disabled={busy}>
              {busy ? 'Sending…' : 'Send test'}
            </button>
          </div>
        </form>

        {msg && <div style={{ marginTop: 10 }}>{msg}</div>}

        <details style={{ marginTop: 14 }}>
          <summary>Where do I get a Slack Incoming Webhook?</summary>
          <ol style={{ marginTop: 8 }}>
            <li>In Slack, open <em>Apps → Browse Apps</em> and search for <strong>Incoming Webhooks</strong>.</li>
            <li>Add it to your workspace and choose the channel to post to.</li>
            <li>Copy the generated URL and paste it above.</li>
          </ol>
        </details>
      </div>
    </Section>
  );
}
