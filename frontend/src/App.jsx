import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { AuthProvider, useAuth } from './state/auth.jsx';

// Lazy load pages for snappier initial render
const Login            = lazy(() => import('./pages/Login.jsx'));
const Dashboard        = lazy(() => import('./pages/Dashboard.jsx'));
const WorkflowConfig   = lazy(() => import('./pages/WorkflowConfig.jsx'));
const WorkflowDetail   = lazy(() => import('./pages/WorkflowDetail.jsx'));
const TaskManagement   = lazy(() => import('./pages/TaskManagement.jsx'));
const Analytics        = lazy(() => import('./pages/Analytics.jsx'));
const Reports          = lazy(() => import('./pages/Reports.jsx'));
const Notifications    = lazy(() => import('./pages/Notifications.jsx'));
const Integrations     = lazy(() => import('./pages/Integrations.jsx'));
const Settings         = lazy(() => import('./pages/Settings.jsx'));
const UserManagement   = lazy(() => import('./pages/UserManagement.jsx'));

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

// Only allow viewing when not logged in (e.g., the /login page)
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  return user ? <Navigate to="/" replace /> : children;
}

// Role gate, e.g. for /settings/users
function RequireRole({ role = 'admin', children }) {
  const { user } = useAuth();
  return user?.role === role ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
        <Routes>
          {/* Guest routes */}
          <Route
            path="/login"
            element={
              <GuestOnly>
                <Login />
              </GuestOnly>
            }
          />

          {/* App shell */}
          <Route
            path="/"
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            {/* Suggested navigation order */}
            <Route index element={<Dashboard />} />
            <Route path="workflows" element={<WorkflowConfig />} />
            <Route path="workflows/:id" element={<WorkflowDetail />} />
            <Route path="tasks" element={<TaskManagement />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="logs" element={<LogsLazy />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="settings/users"
              element={
                <RequireRole role="admin">
                  <UserManagement />
                </RequireRole>
              }
            />

            {/* Backwards-compat redirects for older singular paths */}
            <Route path="workflow" element={<Navigate to="/workflows" replace />} />
            <Route path="workflow/:id" element={<Navigate to="/workflows/:id" replace />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

// Lazy-wrapper for Logs to keep the top list tidy
const LogsLazy = lazy(() => import('./pages/Logs.jsx'));
