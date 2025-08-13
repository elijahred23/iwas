import { useState } from 'react';
import Section from './_scaffold.jsx';
import { AuthAPI } from '../state/auth';

export default function Settings() {
  const [current, setCurrent] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function onChangePassword(e) {
    e.preventDefault();
    setErr(''); setMsg('');

    if (nextPw !== confirm) {
      setErr('New password and confirmation do not match');
      return;
    }
    if (nextPw.length < 8) {
      setErr('New password must be at least 8 characters');
      return;
    }

    try {
      setBusy(true);
      const res = await AuthAPI.changePassword(current, nextPw);
      setMsg(res.message || 'Password changed successfully');
      setCurrent(''); setNextPw(''); setConfirm('');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Failed to change password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Settings" subtitle="Manage your account">
      <div className="page-card" style={{ maxWidth: 520 }}>
        <h3 style={{ marginTop: 0 }}>Change password</h3>
        <form onSubmit={onChangePassword} style={{ display: 'grid', gap: 10 }}>
          <label>
            <div style={{ marginBottom: 4 }}>Current password</div>
            <input
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
            />
          </label>

          <label>
            <div style={{ marginBottom: 4 }}>New password</div>
            <input
              type="password"
              value={nextPw}
              onChange={e => setNextPw(e.target.value)}
              required
              minLength={8}
              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
            />
          </label>

          <label>
            <div style={{ marginBottom: 4 }}>Confirm new password</div>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
            />
          </label>

          {err && <div style={{ color: 'crimson' }}>{err}</div>}
          {msg && <div style={{ color: 'seagreen' }}>{msg}</div>}

          <div>
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </Section>
  );
}
