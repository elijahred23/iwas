import { useEffect, useMemo, useState } from 'react';
import Section from './_scaffold.jsx';
import { WorkflowsAPI } from '../lib/workflows';
import { TasksAPI } from '../lib/tasks';
import { Link } from 'react-router-dom';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [workflows, setWorkflows] = useState([]);
  const [rows, setRows] = useState([]); // flattened tasks across workflows

  // filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all'); 
  const [wfId, setWfId] = useState('all');
  const [assignedTo, setAssignedTo] = useState('');
  const [fromDate, setFromDate] = useState(''); // created_at >=
  const [toDate, setToDate] = useState('');     // created_at <=
  const [sortKey, setSortKey] = useState('created_at'); // created_at | due_date | status | workflow | name
  const [sortDir, setSortDir] = useState('desc');       // asc | desc

  async function load() {
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
  }

  useEffect(() => { load(); }, []);

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

  const headerBtn = (key, label) => (
    <button
      onClick={() => setSortKey(prev => prev === key ? key : key) || setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
      style={{ background:'none', border:'none', cursor:'pointer', fontWeight: sortKey === key ? 700 : 500 }}
      title={`Sort by ${label}`}
    >
      {label}{sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </button>
  );

  return (
    <Section title="Reports" subtitle="Filter tasks across workflows and export to CSV">
      <div className="page-card" style={{ padding: 16, borderRadius: 8 }}>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 140px 160px 160px 140px 140px auto' }}>
          <input
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
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={load} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh'}</button>
            <button onClick={exportCSV} disabled={filtered.length === 0}>Export CSV</button>
          </div>
        </div>

        {error && <div style={{ color: 'crimson', marginTop: 10 }}>{error}</div>}

        <div style={{ marginTop: 14, display:'flex', gap:16, flexWrap:'wrap' }}>
          <Stat label="Total tasks" value={stats.total} />
          <Stat label="Done" value={stats.done} />
          <Stat label="Pending" value={stats.pending} />
          <Stat label="Overdue" value={stats.overdue} />
        </div>

        <div style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 80px 1fr 120px 140px 120px 140px', padding: '10px 12px', background: '#fafafa', fontWeight: 600 }}>
            <div>{headerBtn('workflow', 'Workflow')}</div>
            <div>ID</div>
            <div>{headerBtn('name', 'Task')}</div>
            <div>{headerBtn('status', 'Status')}</div>
            <div>Assigned</div>
            <div>{headerBtn('due_date', 'Due')}</div>
            <div>{headerBtn('created_at', 'Created')}</div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: 14, opacity: 0.7 }}>{busy ? 'Loading…' : 'No results'}</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filtered.map(r => (
                <li key={`${r.workflow_id}:${r.id}`} style={{ display: 'grid', gridTemplateColumns: '220px 80px 1fr 120px 140px 120px 140px', padding: '10px 12px', borderTop: '1px solid #f3f3f3' }}>
                  <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    <Link to={`/workflow/${r.workflow_id}`}>{r.workflow_name}</Link>
                  </div>
                  <div>#{r.id}</div>
                  <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</div>
                  <div style={{ textTransform:'capitalize' }}>{r.status || '—'}</div>
                  <div>{r.assigned_to || '—'}</div>
                  <div>{fmt(r.due_date) || '—'}</div>
                  <div>{fmt(r.created_at) || '—'}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, minWidth: 140 }}>
      <div style={{ fontSize: 12, opacity: 0.65 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
