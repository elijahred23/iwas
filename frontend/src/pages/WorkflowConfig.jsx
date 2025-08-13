import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Section from './_scaffold.jsx';
import { WorkflowsAPI } from '../lib/workflows';

export default function WorkflowConfig() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function load() {
    setBusy(true); setErr('');
    try {
      const data = await WorkflowsAPI.list(); // GET /api/workflows
      setItems(data.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load workflows');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setErr('');
    try {
      const { item } = await WorkflowsAPI.create({ name, description }); // POST /api/workflows
      setItems(prev => [item, ...prev]);
      setName(''); setDescription('');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to create workflow');
    }
  }

  async function remove(id) {
    if (!confirm('Delete this workflow?')) return;
    try {
      await WorkflowsAPI.remove(id); // DELETE /api/workflows/:id
      setItems(prev => prev.filter(w => w.id !== id));
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to delete workflow');
    }
  }

  return (
    <Section title="Workflow Configuration" subtitle="Manage your workflows and automation settings">
      <div className="page-card" style={{ padding:16, borderRadius:8, marginTop:12 }}>
        <h3 style={{ marginTop:0 }}>Create workflow</h3>
        <form onSubmit={create} style={{ display:'grid', gap:8, maxWidth: 520 }}>
          <input
            placeholder="Name"
            value={name}
            onChange={e=>setName(e.target.value)}
            required
            style={{ padding:8, border:'1px solid #ccc', borderRadius:6 }}
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e=>setDescription(e.target.value)}
            rows={3}
            style={{ padding:8, border:'1px solid #ccc', borderRadius:6 }}
          />
          <div><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add workflow'}</button></div>
        </form>
      </div>

      {err && <div style={{ color:'crimson', marginTop:12 }}>{err}</div>}

      <div style={{ marginTop:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <h3 style={{ margin:0 }}>Existing workflows</h3>
          <button onClick={load} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</button>
        </div>

        {items.length === 0 ? (
          <div style={{ opacity:0.7 }}>{busy ? 'Loading…' : 'No workflows yet.'}</div>
        ) : (
          <ul style={{ listStyle:'none', padding:0, margin:0 }}>
            {items.map(w => (
              <li key={w.id}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                           padding:'12px 10px', borderBottom:'1px solid #eee' }}>
                <div>
                  <div style={{ fontWeight:600 }}>{w.name}</div>
                  {w.description && <div style={{ opacity:0.85 }}>{w.description}</div>}
                  <div style={{ fontSize:12, opacity:0.6 }}>
                    #{w.id} • owner {w.user_id} • {w.created_at?.slice(0,10)}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => remove(w.id)}>Delete</button>
                </div>
                <Link to={`/workflow/${w.id}`} style={{ marginLeft: 16 }}>Open</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
