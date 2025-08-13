import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Section from './_scaffold.jsx';
import { AnalyticsAPI } from '../lib/analytics';
import { NotificationsAPI } from '../lib/notifications'; // remove if you don't want the feed

const nf = new Intl.NumberFormat();

/* ---------- small helpers ---------- */
function pctDelta(curr, prev) {
  if (!prev) return curr ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function sumCounts(items) {
  return items.reduce((a, b) => a + (Number(b.count) || 0), 0);
}

/* ---------- tiny sparkline (no deps) ---------- */
function Sparkline({ data, width = 220, height = 48, strokeWidth = 2 }) {
  const nums = data.map(d => Number(d.count) || 0);
  const min = Math.min(...nums, 0);
  const max = Math.max(...nums, 1);
  const span = Math.max(max - min, 1e-6);
  const stepX = data.length <= 1 ? 0 : (width - 8) / (data.length - 1);

  const points = nums.map((v, i) => {
    const x = 4 + i * stepX;
    const y = height - 4 - ((v - min) / span) * (height - 8);
    return [x, y];
  });

  const d = points.map(([x, y], i) => (i ? `L${x},${y}` : `M${x},${y}`)).join(' ');

  return (
    <svg width={width} height={height} role="img" aria-label="30-day task trend">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

/* ---------- stat card ---------- */
function Stat({ label, value, delta }) {
  const up = delta > 0;
  const down = delta < 0;
  const badgeStyle = {
    fontSize: 12,
    padding: '2px 6px',
    borderRadius: 999,
    background: up ? 'rgba(16,185,129,.12)' : down ? 'rgba(239,68,68,.12)' : 'rgba(0,0,0,.06)',
    color: up ? '#10b981' : down ? '#ef4444' : '#444',
  };
  return (
    <div style={{ padding:16, border:'1px solid #eee', borderRadius:10 }}>
      <div style={{ opacity:.7, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:700 }}>{nf.format(value ?? 0)}</div>
      {Number.isFinite(delta) && (
        <div style={{ marginTop:6 }}>
          <span style={badgeStyle}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.round(Math.abs(delta))}%
          </span>
          <span style={{ opacity:.6, marginLeft:6, fontSize:12 }}>vs previous 7 days</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [activity, setActivity] = useState([]);
  const [err, setErr] = useState('');
  const [live, setLive] = useState(true);
  const timer = useRef(null);

  async function loadAll() {
    setErr('');
    try {
      const [{ summary }, dailyRes] = await Promise.all([
        AnalyticsAPI.summary(),
        AnalyticsAPI.daily({ days: 30 }),
      ]);
      setSummary(summary);
      setDaily(dailyRes.items || []);

      // recent activity (remove this block if you don’t want the feed)
      try {
        const notif = await NotificationsAPI.recent({ limit: 5 });
        setActivity(notif.items || []);
      } catch { /* ignore */ }
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to load');
    }
  }

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!live) { if (timer.current) clearInterval(timer.current); return; }
    timer.current = setInterval(loadAll, 60000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [live]);

  // Compute 7-day deltas from daily
  const { last7, prev7, last7Sum, prev7Sum, delta7 } = useMemo(() => {
    const items = daily.slice(-14);
    const prev = items.slice(0, 7);
    const last = items.slice(-7);
    const a = sumCounts(last);
    const b = sumCounts(prev);
    return { last7: last, prev7: prev, last7Sum: a, prev7Sum: b, delta7: pctDelta(a, b) };
  }, [daily]);

  return (
    <Section title="Dashboard" subtitle="Overview at a glance">
      <div className="page-card" style={{ padding: 16, borderRadius: 10, marginBottom: 12, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <button onClick={loadAll}>Refresh</button>
        <label style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} />
          Auto-refresh every 60s
        </label>
        <div style={{ marginLeft:'auto', fontSize:12, opacity:.7 }}>
          Tips: <Link to="/analytics">Analytics</Link> · <Link to="/reports">Reports</Link> · <Link to="/workflows">Workflows</Link>
        </div>
      </div>

      {err && <div style={{color:'crimson', marginBottom:12}}>{err}</div>}

      {!summary ? (
        <div className="page-card" style={{ padding:16, borderRadius:10 }}>Loading…</div>
      ) : (
        <>
          {/* Top stats */}
          <div className="page-card" style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:12 }}>
            <Stat label="Workflows" value={summary.workflows} />
            <Stat label="Tasks" value={summary.tasks_total} delta={delta7} />
            <Stat label="Done" value={summary.tasks_done} />
            <Stat label="Pending" value={summary.tasks_pending} />
          </div>

          {/* Trends + activity */}
          <div className="page-card" style={{ marginTop:12, display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
            <div style={{ padding:16, border:'1px solid #eee', borderRadius:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontWeight:700 }}>Tasks created (30 days)</div>
                  <div style={{ fontSize:12, opacity:.7 }}>
                    Last 7: {nf.format(last7Sum)} · Prev 7: {nf.format(prev7Sum)}
                  </div>
                </div>
                <Link to="/analytics" style={{ fontSize:12 }}>Open analytics →</Link>
              </div>
              <div style={{ marginTop:10 }}>
                <Sparkline data={daily} />
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10, fontSize:12, opacity:.7 }}>
                {daily.slice(-6).map(d => (
                  <div key={d.date} style={{ border:'1px solid #eee', borderRadius:6, padding:'4px 8px' }}>
                    {d.date.slice(5)}: {d.count}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding:16, border:'1px solid #eee', borderRadius:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontWeight:700 }}>Recent activity</div>
                <Link to="/notifications" style={{ fontSize:12 }}>View all →</Link>
              </div>
              {!activity.length ? (
                <div style={{ marginTop:8, opacity:.7 }}>No activity yet</div>
              ) : (
                <ul style={{ listStyle:'none', padding:0, marginTop:8 }}>
                  {activity.map(a => (
                    <li key={a.id} style={{ padding:'6px 0', borderTop:'1px solid #f4f4f4' }}>
                      <div style={{ fontWeight:600, fontSize:14 }}>{a.event}</div>
                      <div style={{ fontSize:12, opacity:.7 }}>
                        In <Link to={`/workflow/${a.workflow?.id}`}>{a.workflow?.name}</Link> • Task #{a.task?.id} • {a.status || '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </Section>
  );
}
