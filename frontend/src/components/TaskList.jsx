import { useCallback, useEffect, useState } from 'react';
import { TasksAPI } from '../lib/tasks';
import { broadcastTaskChange, subscribeTaskChanges } from '../state/taskSync';

export default function TaskList({ workflow }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState(''); 

  const load = useCallback(async () => {
    setBusy(true); setErr('');
    try {
      const data = await TasksAPI.list(workflow.id);
      setItems(data.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load tasks');
    } finally {
      setBusy(false);
    }
  }, [workflow.id]);

  useEffect(() => { load(); }, [workflow.id, load]);
  useEffect(() => {
    const off = subscribeTaskChanges((evt) => {
      if (evt?.workflowId && evt.workflowId !== workflow.id) return;
      load();
    });
    return off;
  }, [workflow.id, load]);

  async function createTask(e) {
    e.preventDefault();
    setErr('');
    try {
      const { item } = await TasksAPI.create(workflow.id, {
        name,
        status: 'pending',
        assigned_to: assignedTo,
        due_date: dueDate || null,
      });
      setItems(prev => [item, ...prev]);
      broadcastTaskChange({ action: 'created', task: item, workflowId: workflow.id });
      setName(''); setAssignedTo(''); setDueDate('');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to create task');
    }
  }

  async function toggleStatus(t) {
    const next = t.status === 'done' ? 'pending' : 'done';
    try {
      const { item } = await TasksAPI.update(t.id, { status: next });
      setItems(prev => prev.map(x => x.id === t.id ? item : x));
      broadcastTaskChange({ action: 'updated', task: item, workflowId: workflow.id });
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to update status');
    }
  }

  async function removeTask(id) {
    if (!confirm('Delete this task?')) return;
    try {
      await TasksAPI.remove(id);
      setItems(prev => prev.filter(x => x.id !== id));
      broadcastTaskChange({ action: 'deleted', taskId: id, workflowId: workflow.id });
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to delete task');
    }
  }

  return (
    <div style={{ marginTop: 10, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
      <h4 style={{ margin: '0 0 8px' }}>Tasks for “{workflow.name}”</h4>

      <form onSubmit={createTask} style={{ display:'grid', gap:8, gridTemplateColumns: '1fr 1fr 160px auto' }}>
        <input placeholder="Task name" value={name} onChange={e=>setName(e.target.value)} required />
        <input placeholder="Assigned to" value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} />
        <input placeholder="Due date (YYYY-MM-DD)" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
        <button className='btn' type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add Task'}</button>
      </form>

      {err && <div style={{ color:'crimson', marginTop:8 }}>{err}</div>}

      <div style={{ marginTop:12 }}>
        {items.length === 0 ? (
          <div style={{ opacity:0.7 }}>{busy ? 'Loading…' : 'No tasks yet.'}</div>
        ) : (
          <ul style={{ listStyle:'none', padding:0, margin:0 }}>
            {items.map(t => (
              <li key={t.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontWeight:600 }}>
                    <input
                      type="checkbox"
                      checked={t.status === 'done'}
                      onChange={() => toggleStatus(t)}
                      style={{ marginRight: 8 }}
                    />
                    {t.name}
                  </div>
                  <div style={{ fontSize:12, opacity:0.7 }}>
                    #{t.id} • {t.assigned_to || 'unassigned'}
                    {t.due_date ? ` • due ${t.due_date}` : '' }
                  </div>
                </div>
                <button onClick={() => removeTask(t.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
