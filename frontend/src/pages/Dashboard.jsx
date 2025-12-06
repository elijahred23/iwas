import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Section from './_scaffold.jsx';
import { AnalyticsAPI } from '../lib/analytics';
import { NotificationsAPI } from '../lib/notifications'; 

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
      <div className="toolbar">
        <span className="badge">Live overview</span>
        <button type="button" className="btn outline btn-sm" onClick={loadAll}>Refresh</button>
        <label className="checkbox">
          <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} />
          Auto-refresh every 60s
        </label>
        <div className="spacer" />
        <div className="muted" style={{ fontSize: 13 }}>
          Tips: <Link to="/analytics">Analytics</Link> · <Link to="/reports">Reports</Link> · <Link to="/workflows">Workflows</Link>
        </div>
      </div>

      {err && <div className="alert" role="alert">{err}</div>}

      {!summary ? (
        <div className="panel">Loading…</div>
      ) : (
        <>
          {/* Top stats */}
          <div className="card-grid stat-grid" style={{ marginTop: 14 }}>
            <div className="stat-card accent">
              <div className="stat-label">Workflows</div>
              <div className="stat-value">{nf.format(summary.workflows || 0)}</div>
              <div className="section-sub" style={{ color: '#e2e8f0' }}>Active automation playbooks</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tasks</div>
              <div className="stat-value">{nf.format(summary.tasks_total || 0)}</div>
              <div className={`stat-delta ${delta7 > 0 ? 'positive' : delta7 < 0 ? 'negative' : ''}`}>
                {delta7 > 0 ? '▲' : delta7 < 0 ? '▼' : '—'} {Math.round(Math.abs(delta7)) || 0}% vs last 7d
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Done</div>
              <div className="stat-value">{nf.format(summary.tasks_done || 0)}</div>
              <div className="section-sub">Completed successfully</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{nf.format(summary.tasks_pending || 0)}</div>
              <div className="section-sub">Awaiting action</div>
            </div>
          </div>

          {/* Trends + activity */}
          <div className="card-grid analytics-grid" style={{ marginTop: 14 }}>
            <div className="panel">
              <div className="panel-title">
                <div>
                  <div>Tasks created (30 days)</div>
                  <div className="section-sub">
                    Last 7: {nf.format(last7Sum)} · Prev 7: {nf.format(prev7Sum)}
                  </div>
                </div>
                <Link to="/analytics" className="subtle-link">Open analytics →</Link>
              </div>
              <div className="spark-shell">
                <Sparkline data={daily} />
              </div>
              <div className="chips">
                {daily.slice(-6).map(d => (
                  <div key={d.date} className="chip">
                    {d.date.slice(5)}: {d.count}
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">
                <div>Recent activity</div>
                <Link to="/notifications" className="subtle-link">View all →</Link>
              </div>
              {!activity.length ? (
                <div className="section-sub" style={{ marginTop: 8 }}>No activity yet</div>
              ) : (
                <ul className="activity-list">
                  {activity.map(a => (
                    <li key={a.id} className="activity-item">
                      <div style={{ fontWeight: 700 }}>{a.event}</div>
                      <small>
                        In <Link to={`/workflows/${a.workflow?.id ?? ''}`}>{a.workflow?.name}</Link> • Task #{a.task?.id} • {a.status || '—'}
                      </small>
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
