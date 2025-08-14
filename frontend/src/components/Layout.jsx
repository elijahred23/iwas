import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';
import { useEffect, useMemo, useState } from 'react';

const navItems = [
  { to: '/',             label: 'Dashboard',        icon: '🏠' },
  { to: '/workflows',     label: 'Workflow Config',  icon: '🛠️' },
  { to: '/integrations', label: 'Integrations',     icon: '🔌' },
  { to: '/reports',      label: 'Reports',          icon: '📊' },
  { to: '/notifications',label: 'Notifications',    icon: '🔔' },
  { to: '/tasks',        label: 'Task Management',  icon: '✅' },
  { to: '/analytics',    label: 'Analytics',        icon: '📈' },
  { to: '/logs',         label: 'Logs',             icon: '📜' },
  { to: '/settings',     label: 'Settings',         icon: '⚙️' },
];

function initials(name = '') {
  return name
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(s => s[0]?.toUpperCase()).join('') || 'U';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // sidebar state (show on desktop, toggle on mobile)
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // close sidebar after navigation on small screens
    setOpen(window.matchMedia('(min-width: 960px)').matches);
  }, [location.pathname]);

  const userInitials = useMemo(() => initials(user?.name), [user?.name]);

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        className={`sidebar${open ? ' open' : ''}`}
        role="navigation"
        aria-label="Primary"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
          <div
            aria-hidden
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg,#2563eb,#22d3ee)',
              color:'#fff', fontWeight: 800, display:'grid', placeItems:'center'
            }}
          >
            IW
          </div>
          <h2 style={{ fontSize: 18 }}>IWAS</h2>
        </div>

        <nav>
          {navItems.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span aria-hidden style={{ width: 22, display:'inline-block' }}>{i.icon}</span>
              {i.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #eee' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div
              aria-hidden
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background:'#e8eefc', color:'#1e40af', fontWeight:700,
                display:'grid', placeItems:'center'
              }}
              title={user?.name}
            >
              {userInitials}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600 }}>{user?.name || 'User'}</div>
              <div style={{ opacity: .7 }}>{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="header" style={{ position:'sticky', top:0, zIndex:10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <button
              type="button"
              className="btn-ghost" // uses your existing ghost style
              onClick={() => setOpen(o => !o)}
              aria-label="Toggle navigation"
              aria-expanded={open}
            >
              ☰
            </button>
            <div style={{ marginLeft: 6, fontWeight: 600 }}>
              {navItems.find(n => location.pathname === n.to)?.label || 'IWAS'}
            </div>
            <div style={{ marginLeft: 'auto', display:'flex', alignItems:'center', gap: 8 }}>
              <span style={{ fontSize: 13, opacity:.8 }}>
                Logged in as <b>{user?.name}</b>
              </span>
              <button
                type="button"
                className="btn outline danger btn-sm"
                onClick={() => {
                  if (confirm('Log out?')) { logout(); navigate('/login'); }
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <main className="main" style={{ width:'100%', marginInline: 'auto' }}>
          <Outlet />
        </main>
      </div>

      {/* Scrim for mobile */}
      {open && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
