import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';
import { useEffect, useMemo, useState } from 'react';

const navItems = [
  { to: '/',             label: 'Dashboard',        short: 'DB' },
  { to: '/workflows',    label: 'Workflow Config',  short: 'WF' },
  { to: '/integrations', label: 'Integrations',     short: 'IN' },
  { to: '/reports',      label: 'Reports',          short: 'RP' },
  { to: '/notifications',label: 'Notifications',    short: 'NT' },
  { to: '/tasks',        label: 'Task Management',  short: 'TK' },
  { to: '/analytics',    label: 'Analytics',        short: 'AN' },
  { to: '/logs',         label: 'Logs',             short: 'LG' },
  { to: '/settings',     label: 'Settings',         short: 'ST' },
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
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [open, setOpen] = useState(isDesktop);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => {
      setIsDesktop(e.matches);
      setOpen(e.matches);
    };
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange);
    };
  }, []);

  useEffect(() => {
    setOpen(isDesktop);
  }, [isDesktop, location.pathname]);

  const userInitials = useMemo(() => initials(user?.name), [user?.name]);
  const currentNav = navItems.find(n => location.pathname === n.to || location.pathname.startsWith(`${n.to}/`));

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside
        className={`sidebar${open ? ' open is-open' : ''}`}
        role="navigation"
        aria-label="Primary"
      >
        <div className="logo">
          <div className="logo-mark" aria-hidden>IW</div>
          <div>
            <div className="logo-text">IWAS</div>
            <div className="logo-sub">Automation OS</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon" aria-hidden>{i.short}</span>
              {i.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar" aria-hidden title={user?.name}>{userInitials}</div>
          <div className="user-meta">
            <div style={{ fontWeight: 700 }}>{user?.name || 'User'}</div>
            <div className="muted">{user?.email}</div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="content-shell">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            ☰
          </button>
          <div className="crumbs">
            <span className="eyebrow">Control center</span>
            <div className="page-title">{currentNav?.label || 'IWAS'}</div>
          </div>
          <div className="topbar-actions">
            <span className="badge">Secure session</span>
            <div className="avatar" aria-hidden>{userInitials}</div>
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
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>

      {/* Scrim for mobile */}
      {open && !isDesktop && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
