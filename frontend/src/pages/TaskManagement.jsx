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

  return (
    <Section title="Task Management" subtitle="All tasks across your workflows">
      {err && <div style={{ color:'crimson', marginBottom: 10 }}>{err}</div>}

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
