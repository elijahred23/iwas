import { useEffect, useState } from 'react';
import Section from './_scaffold.jsx';
import { AnalyticsAPI } from '../lib/analytics';
import { subscribeTaskChanges } from '../state/taskSync';

export default function Analytics() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [summary, setSummary] = useState(null);
  const [statuses, setStatuses] = useState({ total: 0, breakdown: [] });
  const [daily, setDaily] = useState({ items: [] });
  const [overdue, setOverdue] = useState({ overdue: 0, due_today: 0, top_overdue: [] });
  const [recent, setRecent] = useState({ items: [] });
  const [top, setTop] = useState({ items: [] });

  async function load() {
    setBusy(true); setErr('');
    try {
      const [s, st, d, od, rc, tw] = await Promise.all([
        AnalyticsAPI.summary(),
        AnalyticsAPI.statuses(),
        AnalyticsAPI.daily(30),
        AnalyticsAPI.overdue(8),
        AnalyticsAPI.recent(10),
        AnalyticsAPI.topWorkflows(5),
      ]);
      setSummary(s.summary || null);
      setStatuses(st);
      setDaily(d);
      setOverdue(od);
      setRecent(rc);
      setTop(tw);
      setLastUpdated(new Date());
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load analytics');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    const off = subscribeTaskChanges(() => load());
    return () => { if (off) off(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load(), 30000);
    return () => clearInterval(id);
  }, [autoRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Section title="Analytics" subtitle="Trends and operational insights">
      {err && <div style={{ color:'crimson', marginBottom:12 }}>{err}</div>}

      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:8 }}>
        <button onClick={load} disabled={busy}>{busy ? 'Refreshing…' : 'Refresh now'}</button>
        <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:14 }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
          Auto-refresh (30s)
        </label>
        {lastUpdated && (
          <span style={{ fontSize:13, color:'#6b7280' }}>
            Updated at {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Top summary cards */}
      <div className="page-card" style={{ padding:16, borderRadius:8 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
          <StatCard label="Workflows" value={summary?.workflows ?? '—'} />
          <StatCard label="Tasks (total)" value={summary?.tasks_total ?? '—'} />
          <StatCard label="Tasks done" value={summary?.tasks_done ?? '—'} />
          <StatCard label="Tasks pending" value={summary?.tasks_pending ?? '—'} />
        </div>
      </div>

      {/* Status breakdown + Daily chart */}
      <div style={{ display:'grid', gap:12, gridTemplateColumns: '1fr 1.2fr', marginTop:12 }}>
        <div className="page-card" style={{ padding:16, borderRadius:8 }}>
          <h3 style={{ marginTop:0 }}>Status breakdown</h3>
          <StatusBar breakdown={statuses.breakdown} />
          <ul style={{ marginTop:8, paddingLeft:16 }}>
            {statuses.breakdown.map(b => (
              <li key={b.status} style={{ fontSize:14 }}>
                <strong>{b.status}</strong>: {b.count} ({b.pct}%)
              </li>
            ))}
            {statuses.breakdown.length === 0 && <li style={{ opacity:0.6 }}>No tasks yet</li>}
          </ul>
        </div>

        <div className="page-card" style={{ padding:16, borderRadius:8 }}>
          <h3 style={{ marginTop:0 }}>Tasks created — last 30 days</h3>
          <TinyBars data={daily.items} />
        </div>
      </div>

      {/* Overdue snapshot */}
      <div className="page-card" style={{ padding:16, borderRadius:8, marginTop:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <Badge label="Due today" value={overdue.due_today ?? 0} tone="info" />
          <Badge label="Overdue" value={overdue.overdue ?? 0} tone="warn" />
          <button onClick={load} disabled={busy} style={{ marginLeft:'auto' }}>
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <h4 style={{ margin:'12px 0 6px' }}>Top overdue</h4>
        {overdue.top_overdue?.length ? (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ textAlign:'left', borderBottom:'1px solid #eee' }}>
                <th style={{ padding:'6px 4px' }}>Task</th>
                <th style={{ padding:'6px 4px' }}>Workflow</th>
                <th style={{ padding:'6px 4px' }}>Due</th>
                <th style={{ padding:'6px 4px' }}>Days overdue</th>
              </tr>
            </thead>
            <tbody>
              {overdue.top_overdue.map(t => (
                <tr key={t.id} style={{ borderBottom:'1px solid #f6f6f6' }}>
                  <td style={{ padding:'6px 4px' }}>{t.name}</td>
                  <td style={{ padding:'6px 4px', opacity:0.8 }}>{t.workflow?.name}</td>
                  <td style={{ padding:'6px 4px' }}>{t.due_date || '—'}</td>
                  <td style={{ padding:'6px 4px' }}>{t.days_overdue ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ opacity:0.7 }}>No overdue tasks. Nice!</div>
        )}
      </div>

      {/* Top workflows & Recent activity */}
      <div style={{ display:'grid', gap:12, gridTemplateColumns:'1fr 1fr', marginTop:12 }}>
        <div className="page-card" style={{ padding:16, borderRadius:8 }}>
          <h3 style={{ marginTop:0 }}>Top workflows (open vs done)</h3>
          {top.items?.length ? top.items.map(w => (
            <div key={w.id} style={{ margin:'10px 0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14 }}>
                <div style={{ fontWeight:600 }}>{w.name}</div>
                <div style={{ opacity:0.7 }}>open {w.open} • done {w.done}</div>
              </div>
              <StackedBar open={w.open} done={w.done} />
            </div>
          )) : <div style={{ opacity:0.7 }}>No workflows yet</div>}
        </div>

        <div className="page-card" style={{ padding:16, borderRadius:8 }}>
          <h3 style={{ marginTop:0 }}>Recent activity</h3>
          {recent.items?.length ? (
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {recent.items.map((r) => (
                <li key={r.log_id} style={{ padding:'8px 0', borderBottom:'1px solid #f4f4f4' }}>
                  <div style={{ fontSize:14 }}>
                    <strong>{r.workflow?.name}</strong> • {r.task?.name}
                  </div>
                  <div style={{ fontSize:12, opacity:0.75 }}>
                    {r.timestamp?.replace('T',' ').slice(0,19)} — {r.event} (status: {r.status})
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ opacity:0.7 }}>No recent activity</div>
          )}
        </div>
      </div>
    </Section>
  );
}

/** --- Small UI helpers --- */

function StatCard({ label, value }) {
  return (
    <div style={{ border:'1px solid #eee', borderRadius:8, padding:12 }}>
      <div style={{ fontSize:12, textTransform:'uppercase', opacity:0.7 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700 }}>{value}</div>
    </div>
  );
}

function Badge({ label, value, tone = 'info' }) {
  const tones = {
    info: { bg:'#eef6ff', fg:'#1d4ed8' },
    warn: { bg:'#fff7ed', fg:'#c2410c' },
  }[tone] || { bg:'#f3f4f6', fg:'#111827' };

  return (
    <div style={{
      background: tones.bg,
      color: tones.fg,
      borderRadius: 8,
      padding: '8px 12px',
      display:'inline-flex',
      alignItems:'center',
      gap: 8,
      fontWeight:600
    }}>
      <span>{label}</span>
      <span style={{
        background:'#fff',
        padding:'2px 8px',
        borderRadius: 999,
        border:'1px solid #e5e7eb',
        minWidth: 28,
        textAlign:'center'
      }}>{value}</span>
    </div>
  );
}

function StatusBar({ breakdown }) {
  const totalPct = breakdown.reduce((a, b) => a + (b.pct || 0), 0);
  const normalized = breakdown.map(b => ({
    ...b,
    pct: totalPct ? (b.pct * 100 / totalPct) : 0
  }));
  return (
    <div style={{ height:14, borderRadius:999, overflow:'hidden', background:'#f3f4f6' }}>
      {normalized.map((b, i) => (
        <div key={b.status + i}
             title={`${b.status}: ${b.pct.toFixed(1)}%`}
             style={{
               width: `${b.pct}%`,
               height: '100%',
               display:'inline-block',
               background: pickColor(i)
             }} />
      ))}
    </div>
  );
}

function StackedBar({ open, done }) {
  const total = Math.max(1, (open || 0) + (done || 0));
  const openPct = (open || 0) / total * 100;
  const donePct = (done || 0) / total * 100;
  return (
    <div style={{ height:10, borderRadius:999, overflow:'hidden', background:'#f3f4f6' }}>
      <div style={{ width:`${openPct}%`, height:'100%', display:'inline-block', background:'#f97316' }} />
      <div style={{ width:`${donePct}%`, height:'100%', display:'inline-block', background:'#10b981' }} />
    </div>
  );
}

function TinyBars({ data }) {
  // data: [{date:'YYYY-MM-DD', count:number}]
  const max = Math.max(1, ...data.map(d => d.count || 0));
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:100 }}>
      {data.map(d => {
        const h = Math.round((d.count / max) * 100);
        return (
          <div key={d.date} title={`${d.date}: ${d.count}`}
               style={{ width:10, height:h, background:'#3b82f6', borderRadius:2 }} />
        );
      })}
    </div>
  );
}

function pickColor(i) {
  // simple cycling palette (no extra deps)
  const palette = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16'];
  return palette[i % palette.length];
}
