import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';
import { api } from '../lib/api.js';

export default function Login() {
  const [email, setEmail] = useState('elijah@example.com');
  const [password, setPassword] = useState('changeme');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/login', { email, password });
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
    <div className="login-bg">
      <form className="login-card" onSubmit={onSubmit} autoComplete="on">
        <div className="login-head">
          <div className="login-logo" aria-hidden>IWAS</div>
          <h1>Sign in</h1>
          <p className="login-sub">Access your workflows, tasks, and integrations</p>
        </div>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          className="input"
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <label className="label" htmlFor="password">Password</label>
        <div className="input-with-btn">
          <input
            id="password"
            className="input"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={()=>setShowPass(s => !s)}
            aria-label={showPass ? 'Hide password' : 'Show password'}
          >
            {showPass ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="login-actions">
          <label className="checkbox">
            <input type="checkbox" defaultChecked /> Remember me
          </label>
          <a className="link" href="#" onClick={e=>e.preventDefault()}>Forgot password?</a>
        </div>

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Continue'}
        </button>

        <p className="login-foot">
          By continuing you agree to the Terms & Privacy.
        </p>
      </form>
    </div>
  );
}
