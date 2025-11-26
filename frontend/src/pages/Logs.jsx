import { useEffect, useMemo, useState } from 'react';
import Section from './_scaffold.jsx';
import { api } from '../lib/api';

function fmt(ts) {
  if (!ts) return '';
  const s = String(ts);
  return s.length >= 19 ? s.replace('T', ' ').slice(0, 19) : s;
}

export default function Logs() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp' | 'workflow' | 'status'
  const [sortDir, setSortDir] = useState('desc');     // 'asc' | 'desc'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);       // 25 / 50 / 100

  useEffect(() => {
    (async () => {
      try {
        // increase limit if you want more client-side history (e.g., 500)
        const res = await api.get('/logs/recent?limit=100');
        setItems(res.data.items || []);
        setErr('');
        setPage(1);
      } catch (e) {
        setErr(e?.response?.data?.error || 'Failed to load');
      }
    })();
  }, []);

  // sorting
  const sorted = useMemo(() => {
    const arr = [...items];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      if (sortBy === 'timestamp') {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return (ta - tb) * dir;
      }
      if (sortBy === 'workflow') {
        const wa = (a.workflow?.name || '').toLowerCase();
        const wb = (b.workflow?.name || '').toLowerCase();
        return (wa > wb ? 1 : wa < wb ? -1 : 0) * dir;
      }
      if (sortBy === 'status') {
        const sa = (a.status || '').toLowerCase();
        const sb = (b.status || '').toLowerCase();
        return (sa > sb ? 1 : sa < sb ? -1 : 0) * dir;
      }
      return 0;
    });
    return arr;
  }, [items, sortBy, sortDir]);

  // pagination
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  // keep page in range when dependencies change
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  useEffect(() => { setPage(1); }, [sortBy, sortDir, pageSize]);

  return (
    <Section title="Activity Log" subtitle="Recent changes across workflows and tasks">
      {err && <div style={{color:'crimson', marginBottom:10}}>{err}</div>}

      {/* Controls */}
      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:12 }}>
        <label>Sort by:&nbsp;
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}>
            <option value="timestamp">Time</option>
            <option value="workflow">Workflow</option>
            <option value="status">Status</option>
          </select>
        </label>
        <button onClick={()=>setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
          {sortDir === 'asc' ? 'Asc ↑' : 'Desc ↓'}
        </button>
        <label>Per page:&nbsp;
          <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>

        <div style={{ marginLeft:'auto', opacity:.8 }}>
          {total === 0 ? 'No activity' : `Showing ${total === 0 ? 0 : start + 1}–${Math.min(start + pageSize, total)} of ${total}`}
        </div>
      </div>

      {/* List */}
      {pageItems.length === 0 ? (
        <div>No activity yet.</div>
      ) : (
        <ul style={{listStyle:'none',padding:0, margin:0}}>
          {pageItems.map(x=>(
            <li key={x.id} style={{padding:'8px 0', borderBottom:'1px solid #eee'}}>
              <div style={{fontSize:12,opacity:.7}}>{fmt(x.timestamp)}</div>
              <div>
                <b>{x.workflow?.name || '—'}</b> · #{x.task?.id} “{x.task?.name}” — {x.event} ({x.status || '—'})
                {x.duration_ms ? ` • ${x.duration_ms}ms` : ''}
              </div>
              <div style={{ fontSize:12, opacity:0.75 }}>
                {x.actor ? `By ${x.actor.name} (${x.actor.email})` : 'System'}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {total > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
          <button onClick={()=>setPage(1)} disabled={page<=1}>« First</button>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>‹ Prev</button>
          <div style={{ opacity:.8 }}>Page {page} of {totalPages}</div>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}>Next ›</button>
          <button onClick={()=>setPage(totalPages)} disabled={page>=totalPages}>Last »</button>
        </div>
      )}
    </Section>
  );
}
