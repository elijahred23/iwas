import { useCallback, useEffect, useMemo, useState } from 'react';
import Section from './_scaffold.jsx';
import { api } from '../lib/api';
import { subscribeTaskChanges } from '../state/taskSync';

export default function TaskManagement() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');        // server-side status filter (optional)
  const [search, setSearch] = useState('');        // client-side search
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const today = useMemo(() => {
    const t = new Date(); t.setHours(0,0,0,0); return t;
  }, []);

  const load = useCallback(async () => {
    setBusy(true); setErr('');
    try {
      const url = filter ? `/tasks?status=${encodeURIComponent(filter)}` : '/tasks';
      const res = await api.get(url);
      setItems(res.data.items || []);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load');
    } finally {
      setBusy(false);
    }
  }, [filter]);

  // Load on mount + whenever server-side status filter changes
  useEffect(() => { setPage(1); load(); }, [filter, load]);
  useEffect(() => {
    const off = subscribeTaskChanges(() => load());
    return off;
  }, [load]);

  // Derived: search + local filtering (case-insensitive)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((x) => {
      const name = (x.name || '').toLowerCase();
      const wfName = (x.workflow?.name || '').toLowerCase();
      const assigned = (x.assigned_to || '').toLowerCase();
      const status = (x.status || '').toLowerCase();
      return (
        name.includes(q) ||
        wfName.includes(q) ||
        assigned.includes(q) ||
        status.includes(q)
      );
    });
  }, [items, search]);

  // Clamp page when the filtered list changes
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  // Small helpers
  const showingFrom = total === 0 ? 0 : start + 1;
  const showingTo = Math.min(start + pageSize, total);

  // Derived stats for PM visibility
  const stats = useMemo(() => {
    const parseDate = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      return isNaN(dt) ? null : dt;
    };
    const overdue = [];
    const dueSoon = [];
    const done = [];
    filtered.forEach((t) => {
      const due = parseDate(t.due_date);
      const isDone = (t.status || '').toLowerCase() === 'done';
      if (isDone) done.push(t);
      if (due) {
        const diff = Math.floor((due - today) / (1000 * 60 * 60 * 24));
        if (!isDone && due < today) overdue.push({ ...t, due });
        if (!isDone && diff >= 0 && diff <= 7) dueSoon.push({ ...t, due, days: diff });
      }
    });
    overdue.sort((a, b) => a.due - b.due);
    dueSoon.sort((a, b) => a.due - b.due);
    return {
      overdue,
      dueSoon,
      doneCount: done.length,
      total: filtered.length,
      pendingCount: filtered.filter(t => (t.status || '').toLowerCase() !== 'done').length,
    };
  }, [filtered, today]);

  return (
    <Section title="Task Management" subtitle="All tasks across your workflows">
      {err && <div style={{ color:'crimson', marginBottom: 10 }}>{err}</div>}

      {/* Snapshot cards */}
      <div className="page-card" style={{ padding:12, borderRadius:10, marginBottom:12 }}>
        <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))' }}>
          <Stat label="Overdue" value={stats.overdue.length} tone="#dc2626" />
          <Stat label="Due in 7 days" value={stats.dueSoon.length} tone="#d97706" />
          <Stat label="Done" value={stats.doneCount} tone="#16a34a" />
          <Stat label="Open" value={stats.pendingCount} tone="#2563eb" />
        </div>
        <div style={{ display:'grid', gap:12, gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', marginTop:12 }}>
          <MiniList title="Overdue" items={stats.overdue.slice(0,5)} empty="No overdue tasks" />
          <MiniList title="Due soon (≤7d)" items={stats.dueSoon.slice(0,5)} empty="Nothing due soon" />
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center', marginBottom:12 }}>
        <label>
          <span style={{ marginRight:6 }}>Status:</span>
          <select value={filter} onChange={e=>{ setFilter(e.target.value); }} disabled={busy}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </label>

        <label style={{ marginLeft: 8 }}>
          <span style={{ marginRight:6 }}>Search:</span>
          <input
            value={search}
            onChange={e=>{ setSearch(e.target.value); setPage(1); }}
            placeholder="Task, workflow, assignee, status…"
            style={{ padding:6, minWidth: 260 }}
          />
        </label>

        <label style={{ marginLeft: 'auto' }}>
          <span style={{ marginRight:6 }}>Per page:</span>
          <select
            value={pageSize}
            onChange={e=>{ setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>

        <button onClick={load} disabled={busy} style={{ marginLeft: 8 }}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Results meta */}
      <div style={{ marginBottom: 8, opacity: 0.8 }}>
        {busy ? 'Loading…' : (
          total === 0
            ? 'No tasks match your filters.'
            : `Showing ${showingFrom}–${showingTo} of ${total} tasks`
        )}
      </div>

      {/* Table */}
      {total === 0 ? null : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#fafafa' }}>
                <th align="left" style={{ padding:'8px 6px', borderBottom:'1px solid #eee' }}>Task</th>
                <th align="left" style={{ padding:'8px 6px', borderBottom:'1px solid #eee' }}>Workflow</th>
                <th style={{ padding:'8px 6px', borderBottom:'1px solid #eee' }}>Assignee</th>
                <th style={{ padding:'8px 6px', borderBottom:'1px solid #eee' }}>Due</th>
                <th style={{ padding:'8px 6px', borderBottom:'1px solid #eee' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((x) => (
                <tr key={x.id} style={{ borderTop:'1px solid #f0f0f0' }}>
                  <td style={{ padding:'8px 6px' }}>{x.name}</td>
                  <td style={{ padding:'8px 6px' }}>{x.workflow?.name || `#${x.workflow_id}`}</td>
                  <td style={{ padding:'8px 6px', textAlign:'center' }}>{x.assigned_to || '—'}</td>
                  <td style={{ padding:'8px 6px', textAlign:'center' }}>{x.due_date || '—'}</td>
                  <td style={{ padding:'8px 6px', textAlign:'center' }}>{x.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      {total > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12 }}>
          <button onClick={() => setPage(1)} disabled={page <= 1}>« First</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹ Prev</button>
          <div style={{ opacity:0.8 }}>Page {page} of {totalPages}</div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next ›</button>
          <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Last »</button>
        </div>
      )}
    </Section>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:'10px 12px' }}>
      <div style={{ fontSize:12, textTransform:'uppercase', opacity:0.7 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color: tone || '#111827' }}>{value}</div>
    </div>
  );
}

function MiniList({ title, items, empty }) {
  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:10 }}>
      <div style={{ fontWeight:700, marginBottom:6 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ opacity:0.65, fontSize:13 }}>{empty}</div>
      ) : (
        <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:6 }}>
          {items.map(i => (
            <li key={i.id} style={{ display:'flex', justifyContent:'space-between', gap:8, fontSize:13 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i.name}</div>
                <div style={{ opacity:0.7 }}>{i.assigned_to || 'Unassigned'}</div>
              </div>
              <div style={{ textAlign:'right', whiteSpace:'nowrap' }}>{i.due_date || '—'}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
