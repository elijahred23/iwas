// frontend/src/pages/WorkflowConfig.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Section from './_scaffold.jsx';
import { WorkflowsAPI } from '../lib/workflows';

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 350;

export default function WorkflowConfig() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // query state
  const [q, setQ] = useState('');          // input value
  const [query, setQuery] = useState('');  // debounced value actually used in request
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_desc'); // UI sort; server still sorts by id asc

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQuery(q.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  async function load(current = { query, page }) {
    setBusy(true); setErr('');
    try {
      const data = await WorkflowsAPI.list({
        q: current.query ?? query,
        page: current.page ?? page,
        per_page: PAGE_SIZE,
      });
      setItems(data.items || []);
      setTotal(data.total ?? (data.items?.length || 0));
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load workflows');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, [query, page]);

  // client-side sort for display (name/date)
  const sorted = useMemo(() => {
    const copy = [...items];
    switch (sort) {
      case 'name_asc':
        copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        copy.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'created_asc':
        copy.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
        break;
      case 'created_desc':
      default:
        copy.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        break;
    }
    return copy;
  }, [items, sort]);

  async function create(e) {
    e.preventDefault();
    setErr('');
    try {
      const { item } = await WorkflowsAPI.create({ name, description });
      // if your API returns pagination/total, reload is safest to reflect new totals
      setName(''); setDescription('');
      await load({ query, page: 1 }); // jump to first page to surface new item
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to create workflow');
    }
  }

  async function remove(id) {
    if (!confirm('Delete this workflow?')) return;
    try {
      await WorkflowsAPI.remove(id);
      // reload page; if the last item on last page is removed, step back a page
      const isLastOnPage = items.length === 1 && page > 1;
      await load({ query, page: isLastOnPage ? page - 1 : page });
    } catch (e) {
      alert(e?.response?.data?.error || 'Failed to delete workflow');
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Section title="Workflow Configuration" subtitle="Manage your workflows and automation settings">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <input
            className="input input-sm"
            placeholder="Search workflows…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select
            className="input input-sm"
            value={sort}
            onChange={e => setSort(e.target.value)}
            aria-label="Sort"
          >
            <option value="created_desc">Newest</option>
            <option value="created_asc">Oldest</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>
          <button className=" btn-secondary" onClick={() => load()} disabled={busy}>
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="toolbar-right">
          <span className="pill">{total} total</span>
        </div>
      </div>

      {/* Create */}
      <div className="page-card" style={{ padding:16, borderRadius:12, marginTop:12 }}>
        <h3 style={{ marginTop:0 }}>Create workflow</h3>
        <form onSubmit={create} style={{ display:'grid', gap:10, maxWidth: 560 }}>
          <input
            className="input"
            placeholder="Name"
            value={name}
            onChange={e=>setName(e.target.value)}
            required
          />
          <textarea
            className="input"
            placeholder="Description (optional)"
            value={description}
            onChange={e=>setDescription(e.target.value)}
            rows={3}
          />
          <div>
            <button type="submit" className=" btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Add workflow'}
            </button>
          </div>
        </form>
      </div>

      {err && <div style={{ color:'crimson', marginTop:12 }}>{err}</div>}

      {/* List */}
      <div style={{ marginTop:16 }}>
        <h3 style={{ margin:'0 0 8px' }}>Existing workflows</h3>

        {items.length === 0 ? (
          <div className="empty-state">
            {busy ? 'Loading…' : (query ? 'No results.' : 'No workflows yet.')}
          </div>
        ) : (
          <ul style={{ listStyle:'none', padding:0, margin:0, display:'grid', gap:10 }}>
            {sorted.map(w => (
              <li key={w.id} className="card-row">
                <div className="card-row-main">
                  <div className="card-title">{w.name}</div>
                  {w.description && <div className="card-subtitle">{w.description}</div>}
                  <div className="meta">
                    <span className="pill">#{w.id}</span>
                    <span className="sep">•</span>
                    <span>owner {w.user_id}</span>
                    <span className="sep">•</span>
                    <span>{(w.created_at || '').slice(0,10)}</span>
                  </div>
                </div>
                <div className="card-row-actions">
                  <Link className=" btn-ghost" to={`/workflow/${w.id}`}>Open</Link>
                  <button className=" btn-danger" onClick={() => remove(w.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        <div className="pager">
          <button
            className=" btn-ghost"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || busy}
          >
            ← Prev
          </button>
          <span className="pill">Page {page} / {totalPages}</span>
          <button
            className=" btn-ghost"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || busy}
          >
            Next →
          </button>
        </div>
      </div>
    </Section>
  );
}
