import { useEffect, useState } from 'react';
import Section from './_scaffold.jsx';
import { api } from '../lib/api';

export default function Logs() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      try { setItems((await api.get('/logs/recent?limit=100')).data.items || []); }
      catch (e) { setErr(e?.response?.data?.error || 'Failed to load'); }
    })();
  }, []);
  return (
    <Section title="Activity Log" subtitle="Recent changes across workflows and tasks">
      {err && <div style={{color:'crimson'}}>{err}</div>}
      {items.length === 0 ? <div>No activity yet.</div> : (
        <ul style={{listStyle:'none',padding:0}}>
          {items.map(x=>(
            <li key={x.id} style={{padding:'8px 0', borderBottom:'1px solid #eee'}}>
              <div style={{fontSize:12,opacity:.7}}>{x.timestamp}</div>
              <div><b>{x.workflow.name}</b> · #{x.task.id} “{x.task.name}” — {x.event} ({x.status})</div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
