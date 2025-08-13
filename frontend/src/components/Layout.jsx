import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/workflow', label: 'Workflow Config' },
  { to: '/integrations', label: 'Integrations' },
  { to: '/reports', label: 'Reports' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/tasks', label: 'Task Management' },
  { to: '/settings', label: 'Settings' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/logs', label: 'Logs' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <h2 style={{ marginBottom: '1rem' }}>IWAS</h2>
        {navItems.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {i.label}
          </NavLink>
        ))}
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header className="header">
          <span>Logged in as {user?.name}</span>
          <button type="button" className="btn outline danger btn-sm" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
