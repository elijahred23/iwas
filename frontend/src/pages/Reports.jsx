import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Section from './_scaffold.jsx';
import { WorkflowsAPI } from '../lib/workflows';
import { TasksAPI } from '../lib/tasks';
import { Link } from 'react-router-dom';
import { subscribeTaskChanges } from '../state/taskSync';

function fmt(dateLike) {
  if (!dateLike) return '';
  try {
    const s = String(dateLike);
    return s.length >= 10 ? s.slice(0, 10) : s;
  } catch {
    return '';
  }
}

function toCSV(rows, headers) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = headers.map(h => esc(h.label)).join(',');
  const body = rows.map(r =>
    headers.map(h => esc(h.value(r))).join(',')
  ).join('\n');
  return head + '\n' + body;
}

export default function Reports() {
  const PAGE_SIZE = 18;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [workflows, setWorkflows] = useState([]);
  const [rows, setRows] = useState([]); // flattened tasks across workflows
  const [page, setPage] = useState(1);

  // filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all'); 
  const [wfId, setWfId] = useState('all');
  const [assignedTo, setAssignedTo] = useState('');
  const [fromDate, setFromDate] = useState(''); // created_at >=
  const [toDate, setToDate] = useState('');     // created_at <=
  const [sortKey, setSortKey] = useState('created_at'); // created_at | due_date | status | workflow | name
  const [sortDir, setSortDir] = useState('desc');       // asc | desc

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      // 1) get workflows for the current user (admin sees all)
      const w = await WorkflowsAPI.list();
      const wfItems = w.items || [];
      setWorkflows(wfItems);

      // 2) fetch tasks for each workflow in parallel
      const taskLists = await Promise.all(
        wfItems.map(wf => TasksAPI.list(wf.id).then(r => ({ wf, tasks: r.items || [] })))
      );

      // 3) flatten and annotate with workflow info
      const flattened = taskLists.flatMap(({ wf, tasks }) =>
        tasks.map(t => ({
          ...t,
          workflow_id: wf.id,
          workflow_name: wf.name,
        }))
      );

      setRows(flattened);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load report data');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const off = subscribeTaskChanges(() => load());
    return off;
  }, [load]);
  useEffect(() => { setPage(1); }, [q, status, wfId, assignedTo, fromDate, toDate, sortKey, sortDir]);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const filtered = useMemo(() => {
    let data = rows;

    if (wfId !== 'all') {
      const idNum = Number(wfId);
      data = data.filter(r => r.workflow_id === idNum);
    }
    if (status !== 'all') {
      data = data.filter(r => (r.status || '').toLowerCase() === status);
    }
    if (assignedTo.trim()) {
      const needle = assignedTo.trim().toLowerCase();
      data = data.filter(r => (r.assigned_to || '').toLowerCase().includes(needle));
    }
    if (q.trim()) {
      const k = q.trim().toLowerCase();
      data = data.filter(r =>
        (r.name || '').toLowerCase().includes(k) ||
        (r.workflow_name || '').toLowerCase().includes(k)
      );
    }
    if (fromDate) {
      data = data.filter(r => (fmt(r.created_at) || '') >= fromDate);
    }
    if (toDate) {
      data = data.filter(r => (fmt(r.created_at) || '') <= toDate);
    }

    const cmp = (a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const get = {
        created_at: (x) => fmt(x.created_at),
        due_date:   (x) => fmt(x.due_date),
        status:     (x) => (x.status || '').toLowerCase(),
        workflow:   (x) => (x.workflow_name || '').toLowerCase(),
        name:       (x) => (x.name || '').toLowerCase(),
      }[sortKey] || ((x) => fmt(x.created_at));
      const va = get(a), vb = get(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    };

    return [...data].sort(cmp);
  }, [rows, wfId, status, assignedTo, q, fromDate, toDate, sortKey, sortDir]);

  const visible = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page, PAGE_SIZE]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const done = filtered.filter(r => (r.status || '').toLowerCase() === 'done').length;
    const pending = total - done;
    const overdue = filtered.filter(r =>
      r.due_date && fmt(r.due_date) < todayStr && (r.status || '').toLowerCase() !== 'done'
    ).length;
    return { total, done, pending, overdue };
  }, [filtered, todayStr]);

  function exportCSV() {
    const headers = [
      { label: 'Workflow', value: r => r.workflow_name },
      { label: 'Task ID', value: r => r.id },
      { label: 'Task Name', value: r => r.name },
      { label: 'Status', value: r => r.status },
      { label: 'Assigned To', value: r => r.assigned_to || '' },
      { label: 'Due Date', value: r => fmt(r.due_date) },
      { label: 'Created At', value: r => fmt(r.created_at) },
    ];
    const csv = toCSV(filtered, headers);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateTag = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `iwas-report-${dateTag}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  const headerBtn = (key, label) => {
    const active = sortKey === key;
    const dir = active && sortDir === 'asc' ? '▲' : active ? '▼' : '';
    return (
      <button
        className="sort-btn"
        onClick={() => {
          setSortKey(key);
          setSortDir(prev => (active && prev === 'asc' ? 'desc' : 'asc'));
        }}
        title={`Sort by ${label}`}
      >
        {label} {dir}
      </button>
    );
  };

  // simple intersection observer to lazy-load pages
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (visible.length >= filtered.length) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            setPage(p => Math.min(p + 1, Math.ceil(filtered.length / PAGE_SIZE)));
          }
        });
      },
      { rootMargin: '220px 0px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visible.length, filtered.length, PAGE_SIZE]);

  return (
    <Section
      title="Reports"
      subtitle="Filter tasks across workflows, paginate results, and export to CSV"
      actions={
        <>
          <button className="btn outline btn-sm" onClick={load} disabled={busy}>
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn btn-sm" onClick={exportCSV} disabled={filtered.length === 0}>
            Export CSV
          </button>
        </>
      }
    >
      <div className="panel">
        <div className="reports-filters">
          <input
            className="reports-search"
            placeholder="Search (task/workflow)"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
          <select value={wfId} onChange={e => setWfId(e.target.value)}>
            <option value="all">All workflows</option>
            {workflows.map(w => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>
          <input
            placeholder="Assigned to"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
          />
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input type="date" value={toDate}   onChange={e => setToDate(e.target.value)} />
          <div className="reports-actions">
            <div className="pill">
              <span className="status-dot" />
              Live sync on change
            </div>
          </div>
        </div>

        {error && <div className="alert" role="alert" style={{ marginTop: 10 }}>{error}</div>}

        <div className="card-grid stat-grid" style={{ marginTop: 14 }}>
          <Stat label="Total tasks" value={stats.total} />
          <Stat label="Done" value={stats.done} tone="success" />
          <Stat label="Pending" value={stats.pending} tone="warning" />
          <Stat label="Overdue" value={stats.overdue} tone="danger" />
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <div className="table-head">
          <div style={{ fontWeight: 700 }}>Results</div>
          <div className="muted">{visible.length} of {filtered.length} tasks</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{headerBtn('workflow', 'Workflow')}</th>
              <th>ID</th>
              <th>{headerBtn('name', 'Task')}</th>
              <th>{headerBtn('status', 'Status')}</th>
              <th>Assigned</th>
              <th>{headerBtn('due_date', 'Due')}</th>
              <th>{headerBtn('created_at', 'Created')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
                  {busy ? 'Loading…' : 'No results'}
                </td>
              </tr>
            ) : (
              visible.map(r => (
                <tr key={`${r.workflow_id}:${r.id}`}>
                  <td>
                    <Link to={`/workflows/${r.workflow_id}`}>{r.workflow_name}</Link>
                  </td>
                  <td>#{r.id}</td>
                  <td>{r.name}</td>
                  <td>
                    <span className={`status-pill ${(r.status || '').toLowerCase()}`}>
                      <span className="status-dot" />
                      {r.status || '—'}
                    </span>
                  </td>
                  <td>{r.assigned_to || '—'}</td>
                  <td>{fmt(r.due_date) || '—'}</td>
                  <td>{fmt(r.created_at) || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="table-foot">
          <div className="muted">Auto-loading more as you scroll</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button
              className="btn outline btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <div className="muted">Page {page} · {(Math.ceil(filtered.length / PAGE_SIZE)) || 1}</div>
            <button
              className="btn btn-sm"
              onClick={() => setPage(p => Math.min(p + 1, Math.ceil(filtered.length / PAGE_SIZE)))}
              disabled={visible.length >= filtered.length}
            >
              Load more
            </button>
          </div>
        </div>
        {visible.length < filtered.length && <div ref={sentinelRef} />}
      </div>
    </Section>
  );
}

function Stat({ label, value, tone }) {
  const colors = {
    success: { bg: 'linear-gradient(135deg, #ecfdf3, #d1fae5)', text: '#15803d' },
    warning: { bg: 'linear-gradient(135deg, #fff7ed, #ffedd5)', text: '#c2410c' },
    danger:  { bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', text: '#b91c1c' },
    default: { bg: 'linear-gradient(135deg, #f8fafc, #eef2ff)', text: '#0f172a' },
  };
  const palette = colors[tone] || colors.default;
  return (
    <div
      className="stat-card"
      style={{ background: palette.bg, color: palette.text, borderColor: 'rgba(15,23,42,0.06)' }}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
