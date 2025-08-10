import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import WorkflowConfig from './pages/WorkflowConfig.jsx';
import Integrations from './pages/Integrations.jsx';
import Reports from './pages/Reports.jsx';
import Notifications from './pages/Notifications.jsx';
import TaskManagement from './pages/TaskManagement.jsx';
import Settings from './pages/Settings.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Analytics from './pages/Analytics.jsx';
import Logs from './pages/Logs.jsx';
import Layout from './components/Layout.jsx';
import { AuthProvider, useAuth } from './state/auth.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Layout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="workflow" element={<WorkflowConfig />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="tasks" element={<TaskManagement />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/users" element={<UserManagement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="logs" element={<Logs />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
