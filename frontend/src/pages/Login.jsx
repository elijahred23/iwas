import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';

export default function Login() {
  const [name, setName] = useState('Elijah Proctor');
  const [role, setRole] = useState('admin');
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="page-card" style={{ width: '300px' }}>
        <h2>Sign in to IWAS</h2>
        <label>Name</label>
        <input
          style={{ width: '100%', marginBottom: '0.5rem' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label>Role</label>
        <select
          style={{ width: '100%', marginBottom: '1rem' }}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="user">User</option>
        </select>
        <button
          onClick={() => { login({ name, role }); navigate('/'); }}
          style={{ width: '100%' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
