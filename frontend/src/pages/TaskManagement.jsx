import { useEffect, useState } from 'react';
import Section from './_scaffold.jsx';
import { api } from '../lib/api';

export default function TaskManagement() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    try {
      const url = filter ? `/tasks?status=${encodeURIComponent(filter)}` : '/tasks';
      setItems((await api.get(url)).data.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load');
    }
  }
  useEffect(()=>{ load(); }, [filter]);

  return (
    <Section title="Task Management" subtitle="All tasks across your workflows">
      {err && <div style={{color:'crimson'}}>{err}</div>}
      <div style={{marginBottom:10}}>
        <select value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
      </div>
      {items.length === 0 ? <div>No tasks.</div> : (
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr><th align="left">Task</th><th align="left">Workflow</th><th>Due</th><th>Status</th></tr>
          </thead>
          <tbody>
            {items.map(x=>(
              <tr key={x.id} style={{borderTop:'1px solid #eee'}}>
                <td>{x.name}</td>
                <td>{x.workflow.name}</td>
                <td align="center">{x.due_date || '—'}</td>
                <td align="center">{x.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
