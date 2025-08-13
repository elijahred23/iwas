import { useEffect, useMemo, useRef, useState } from 'react';
import Section from './_scaffold.jsx';
import { NotificationsAPI } from '../lib/notifications';
import { Link } from 'react-router-dom';

function fmt(ts) {
  if (!ts) return '';
  const s = String(ts);
  return s.length >= 19 ? s.replace('T', ' ').slice(0, 19) : s;
}

const LS_KEY = 'iwas.readNotificationIds';

function useReadSet() {
  const [setState, setSetState] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });
  const persist = (s) => {
    setSetState(new Set(s));
    try { localStorage.setItem(LS_KEY, JSON.stringify([...s])); } catch {}
  };
  return [setState, persist];
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [readSet, setReadSet] = useReadSet();
  const [live, setLive] = useState(true);
  const [limit, setLimit] = useState(50);
  const timer = useRef(null);

  const newestId = useMemo(() => (items[0]?.id || 0), [items]);

  async function load(opts = {}) {
    setErr('');
    try {
      const data = await NotificationsAPI.recent({ limit, ...opts });
      if (opts.after_id) {
        // incremental prepend (newest first from API)
        setItems(prev => {
          const incoming = data.items || [];
          if (!incoming.length) return prev;
          // Avoid duplicates
          const have = new Set(prev.map(i => i.id));
          const dedup = incoming.filter(i => !have.has(i.id));
          return [...dedup, ...prev];
        });
      } else {
        setItems(data.items || []);
      }
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load notifications');
    }
  }

  useEffect(() => {
    setItems([]); // reset when limit changes
    load();
  }, [limit]);

  useEffect(() => {
    if (!live) {
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
      return;
    }
    timer.current = setInterval(() => {
      if (newestId) load({ after_id: newestId });
      else load();
    }, 8000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [live, newestId, limit]);

  function markAllRead() {
    const s = new Set(readSet);
    items.forEach(i => s.add(i.id));
    setReadSet(s);
  }
  function toggleRead(id) {
    const s = new Set(readSet);
    if (s.has(id)) s.delete(id); else s.add(id);
    setReadSet(s);
  }

  const unreadCount = items.filter(i => !readSet.has(i.id)).length;

  return (
    <Section title="Notifications" subtitle="Recent activity from your workflows and tasks">
      <div className="page-card" style={{ padding: 16, borderRadius: 8 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={() => load()} disabled={busy}>Refresh</button>
          <label style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} />
            Live (8s)
          </label>
          <label>
            Show:&nbsp;
            <select value={limit} onChange={e => setLimit(Number(e.target.value))}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
          <div style={{ marginLeft:'auto', fontSize:12, opacity:0.7 }}>
            {unreadCount} unread
          </div>
          <button onClick={markAllRead}>Mark all read</button>
        </div>

        {err && <div style={{ color:'crimson', marginTop:10 }}>{err}</div>}

        <div style={{ marginTop:12, border:'1px solid #eee', borderRadius:8, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 220px 160px', fontWeight:600, background:'#fafafa', padding:'10px 12px' }}>
            <div>ID</div>
            <div>Event</div>
            <div>Task / Workflow</div>
            <div>When</div>
          </div>
          {items.length === 0 ? (
            <div style={{ padding:14, opacity:0.7 }}>{busy ? 'Loading…' : 'No activity yet'}</div>
          ) : (
            <ul style={{ listStyle:'none', margin:0, padding:0 }}>
              {items.map(n => {
                const unread = !readSet.has(n.id);
                return (
                  <li key={n.id} style={{
                    display:'grid',
                    gridTemplateColumns:'80px 1fr 220px 160px',
                    padding:'10px 12px',
                    borderTop:'1px solid #f3f3f3',
                    background: unread ? 'rgba(0,128,255,0.05)' : 'transparent'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span title={unread ? 'Unread' : 'Read'} style={{
                        width:8, height:8, borderRadius:4,
                        background: unread ? '#007bff' : '#ccc', display:'inline-block'
                      }} />
                      #{n.id}
                    </div>
                    <div>
                      <div style={{ fontWeight:600 }}>{n.event}</div>
                      <div style={{ fontSize:12, opacity:0.75 }}>Status: {n.status || '—'}</div>
                    </div>
                    <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      <div title={n.task?.name}>Task: #{n.task?.id} — {n.task?.name}</div>
                      <div>Workflow: <Link to={`/workflow/${n.workflow?.id}`}>{n.workflow?.name}</Link></div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'space-between' }}>
                      <span>{fmt(n.when)}</span>
                      <button onClick={() => toggleRead(n.id)} style={{ fontSize:12 }}>
                        Mark {unread ? 'read' : 'unread'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}
