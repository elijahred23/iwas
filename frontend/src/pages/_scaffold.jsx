export default function Section({ title, subtitle }) {
  return (
    <div className="page-card">
      <h1>{title}</h1>
      {subtitle && <p style={{ color: '#555', marginTop: '0.3rem' }}>{subtitle}</p>}
    </div>
  );
}
