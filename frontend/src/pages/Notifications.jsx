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
  const [pageSize, setPageSize] = useState(50);   // acts as fetch limit + page size
  const [page, setPage] = useState(1);            // client-side page
  const timer = useRef(null);

  const newestId = useMemo(() => (items[0]?.id || 0), [items]);

  async function load(opts = {}) {
    setErr(''); setBusy(true);
    try {
      const data = await NotificationsAPI.recent({ limit: pageSize, ...opts });
      if (opts.after_id) {
        setItems(prev => {
          const incoming = data.items || [];
          if (!incoming.length) return prev;
          const have = new Set(prev.map(i => i.id));
          const dedup = incoming.filter(i => !have.has(i.id));
          return [...dedup, ...prev];
        });
      } else {
        setItems(data.items || []);
      }
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load notifications');
    } finally {
      setBusy(false);
    }
  }

  // Initial load + when pageSize changes
  useEffect(() => {
    setItems([]);
    setPage(1);
    load();
  }, [pageSize]);

  // Live polling (prepend new items if any)
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
  }, [live, newestId, pageSize]);

  // Client-side pagination
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const start = (page - 1) * pageSize;
  const pageItems = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize]
  );

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
  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + pageSize, total);

  return (
    <Section title="Notifications" subtitle="Recent activity from your workflows and tasks">
      <div className="page-card" style={{ padding: 16, borderRadius: 8 }}>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={() => load()} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</button>
          <label style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} />
            Live (8s)
          </label>
          <label>
            Show:&nbsp;
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); }}
            >
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

        {/* Meta + pagination header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12, marginBottom:8 }}>
          <div style={{ opacity:0.8 }}>
            {busy ? 'Loading…' : (total === 0 ? 'No activity yet' : `Showing ${showingFrom}–${showingTo} of ${total}`)}
          </div>
          {total > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
              <button onClick={() => setPage(1)} disabled={page <= 1}>« First</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹ Prev</button>
              <div style={{ opacity:0.8 }}>Page {page} of {totalPages}</div>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last »</button>
            </div>
          )}
        </div>

        <div style={{ border:'1px solid #eee', borderRadius:8, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 220px 160px', fontWeight:600, background:'#fafafa', padding:'10px 12px' }}>
            <div>ID</div>
            <div>Event</div>
            <div>Task / Workflow</div>
            <div>When</div>
          </div>

          {pageItems.length === 0 ? (
            <div style={{ padding:14, opacity:0.7 }}>{busy ? 'Loading…' : 'No activity in this page'}</div>
          ) : (
            <ul style={{ listStyle:'none', margin:0, padding:0 }}>
              {pageItems.map(n => {
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

        {/* Pagination footer (duplicate for convenience) */}
        {total > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
            <button onClick={() => setPage(1)} disabled={page <= 1}>« First</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹ Prev</button>
            <div style={{ opacity:0.8 }}>Page {page} of {totalPages}</div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next ›</button>
            <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last »</button>
          </div>
        )}
      </div>
    </Section>
  );
}