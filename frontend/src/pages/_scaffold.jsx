export default function Section({ title, subtitle, children }) {
  return (
    <div className="page-card">
      <h1>{title}</h1>
      {subtitle && <p style={{ color: '#555', marginTop: '0.3rem' }}>{subtitle}</p>}
      <div style={{marginTop: 12}}>
        {children}
      </div>
    </div>
  );
}
