import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Section from './_scaffold.jsx';
import { TasksAPI } from '../lib/tasks';
import { WorkflowsAPI } from '../lib/workflows';
import { broadcastTaskChange, subscribeTaskChanges } from '../state/taskSync';

export default function WorkflowDetail() {
  const { id } = useParams();
  const [wf, setWf] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [assigned, setAssigned] = useState('');
  const [due, setDue] = useState(''); // YYYY-MM-DD

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      const [wfResp, tResp] = await Promise.all([
        WorkflowsAPI.get(id),
        TasksAPI.list(id),
      ]);
      setWf(wfResp.item);
      setItems(tResp.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load');
    } finally {
      setBusy(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [id, load]);
  useEffect(() => {
    const off = subscribeTaskChanges((evt) => {
      if (evt?.workflowId && String(evt.workflowId) !== String(id)) return;
      load();
    });
    return off;
  }, [id, load]);

  async function addTask(e) {
    e.preventDefault();
    setErr('');
    try {
      const { item } = await TasksAPI.create(id, {
        name,
        assigned_to: assigned || undefined,
        due_date: due || undefined,
      });
      setItems(prev => [item, ...prev]);
      broadcastTaskChange({ action: 'created', task: item, workflowId: Number(id) });
      setName(''); setAssigned(''); setDue('');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to create task');
    }
  }

  async function setStatus(t, next) {
    try {
      const { item } = await TasksAPI.update(t.id, { status: next });
      setItems(prev => prev.map(x => x.id === t.id ? item : x));
      broadcastTaskChange({ action: 'updated', task: item, workflowId: Number(id) });
    } catch (e) {
      alert(e?.response?.data?.error || 'Update failed');
    }
  }

  async function removeTask(taskId) {
    if (!confirm('Delete this task?')) return;
    try {
      await TasksAPI.remove(taskId);
      setItems(prev => prev.filter(x => x.id !== taskId));
      broadcastTaskChange({ action: 'deleted', taskId, workflowId: Number(id) });
    } catch (e) {
      alert(e?.response?.data?.error || 'Delete failed');
    }
  }

  return (
    <Section title={wf ? `Workflow: ${wf.name}` : 'Workflow'} subtitle={<Link to="/workflows">← Back</Link>}>
      {err && <div style={{ color:'crimson', marginBottom:12 }}>{err}</div>}

      {wf && (
        <div className="page-card" style={{ padding:16, borderRadius:8, marginBottom:16 }}>
          <div style={{ fontSize:14, opacity:0.8 }}>
            #{wf.id} • owner {wf.user_id} • {wf.created_at?.slice(0,10)}
          </div>
          {wf.description && <p style={{ marginTop:8 }}>{wf.description}</p>}
        </div>
      )}

      <form onSubmit={addTask} style={{ display:'grid', gap:8, maxWidth:520 }}>
        <input placeholder="Task name" value={name} onChange={e=>setName(e.target.value)} required />
        <input placeholder="Assigned to" value={assigned} onChange={e=>setAssigned(e.target.value)} />
        <input type="date" value={due} onChange={e=>setDue(e.target.value)} />
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add task'}</button>
      </form>

      <div style={{ marginTop:16 }}>
        <h3 style={{ margin:0 }}>Tasks</h3>
        {items.length === 0 ? (
          <div style={{ opacity:0.7 }}>{busy ? 'Loading…' : 'No tasks yet.'}</div>
        ) : (
          <ul style={{ listStyle:'none', padding:0, margin:0 }}>
            {items.map(t => (
              <li key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #eee' }}>
                <div>
                  <div style={{ fontWeight:600, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize:12, opacity:0.7 }}>
                    #{t.id} • {t.status} {t.assigned_to ? `• ${t.assigned_to}` : ''} {t.due_date ? `• due ${t.due_date}` : ''}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <select value={t.status || 'pending'} onChange={e => setStatus(t, e.target.value)}>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="failed">Failed</option>
                  </select>
                  <button onClick={() => removeTask(t.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
