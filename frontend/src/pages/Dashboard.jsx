import { useEffect, useState } from 'react';
import Section from './_scaffold.jsx';
import { AnalyticsAPI } from '../lib/analytics';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try { setSummary((await AnalyticsAPI.summary()).summary); }
      catch (e) { setErr(e?.response?.data?.error || 'Failed to load'); }
    })();
  }, []);

  return (
    <Section title="Dashboard" subtitle="Overview at a glance">
      {err && <div style={{color:'crimson'}}>{err}</div>}
      {!summary ? <div>Loading…</div> : (
        <div className="page-card" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          <Card label="Workflows" value={summary.workflows}/>
          <Card label="Tasks" value={summary.tasks_total}/>
          <Card label="Done" value={summary.tasks_done}/>
          <Card label="Pending" value={summary.tasks_pending}/>
        </div>
      )}
    </Section>
  );
}
function Card({label,value}) {
  return <div style={{padding:16,border:'1px solid #eee',borderRadius:8}}>
    <div style={{opacity:.7}}>{label}</div>
    <div style={{fontSize:24,fontWeight:700}}>{value}</div>
  </div>;
}
