export default function Section({ title, subtitle, actions = null, children }) {
  return (
    <div className="page-card">
      <div className="section-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="section-sub">{subtitle}</p>}
        </div>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      <div style={{ marginTop: 14 }}>
        {children}
      </div>
    </div>
  );
}
