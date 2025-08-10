import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';
import { api } from '../lib/api.js';

export default function Login() {
  const [email, setEmail] = useState('elijah@example.com');
  const [password, setPassword] = useState('changeme');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // 1) Send credentials; server sets HttpOnly cookie
      await api.post('/auth/login', { email, password });

      // 2) Fetch current user (proves the cookie worked)
      const me = await api.get('/auth/me');
      if (me.data?.ok) {
        login(me.data.user);
        navigate('/');
      } else {
        setError('Could not load profile.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <form onSubmit={onSubmit} className="page-card" style={{ width: 340 }}>
        <h2>Sign in to IWAS</h2>

        <label style={{ display: 'block', marginTop: 12 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
        />

        <label style={{ display: 'block', marginTop: 12 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
        />

        {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}

        <button
          type="submit"
          disabled={busy}
          style={{ width: '100%', marginTop: 16, padding: 10, borderRadius: 6 }}
        >
          {busy ? 'Signing in…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
