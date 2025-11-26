import { useEffect, useState } from "react";
import Section from "./_scaffold.jsx";
import { AuthAPI, useAuth, useCan } from "../state/auth.jsx";

const ROLE_LABELS = {
  admin: "Administrator",
  manager: "Manager",
  user: "Contributor",
};

export default function UserManagement() {
  const { user } = useAuth();
  const canAdmin = useCan(["admin"]);
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(""); setMsg("");
    try {
      const data = await AuthAPI.listUsers();
      setUsers(data.users || []);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load users");
    }
  }

  useEffect(() => { if (canAdmin) load(); }, [canAdmin]);

  async function changeRole(id, role) {
    setErr(""); setMsg("");
    try {
      await AuthAPI.updateUserRole(id, role);
      setMsg("Role updated");
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to update role");
    }
  }

  if (!user) {
    return (
      <Section title="User Management" subtitle="Manage users and permissions">
        <p>Please sign in to manage users.</p>
      </Section>
    );
  }
  if (!canAdmin) {
    return (
      <Section title="User Management" subtitle="Manage users and permissions">
        <p>You do not have permission to manage users. Contact an administrator.</p>
      </Section>
    );
  }

  return (
    <Section title="User Management" subtitle="Assign roles and control access">
      {err && <div style={{ color:'crimson', marginBottom:8 }}>{err}</div>}
      {msg && <div style={{ color:'seagreen', marginBottom:8 }}>{msg}</div>}

      <div className="page-card" style={{ padding:16, borderRadius:10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <h3 style={{ margin:0 }}>Team</h3>
          <button onClick={load} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</button>
        </div>

        {users.length === 0 ? (
          <div style={{ opacity:0.7 }}>No users found.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#fafafa' }}>
                  <th align="left" style={{ padding:'8px 6px', borderBottom:'1px solid #eee' }}>User</th>
                  <th align="left" style={{ padding:'8px 6px', borderBottom:'1px solid #eee' }}>Email</th>
                  <th style={{ padding:'8px 6px', borderBottom:'1px solid #eee' }}>Role</th>
                  <th style={{ padding:'8px 6px', borderBottom:'1px solid #eee' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderTop:'1px solid #f0f0f0' }}>
                    <td style={{ padding:'8px 6px' }}>{u.name}</td>
                    <td style={{ padding:'8px 6px' }}>{u.email}</td>
                    <td style={{ padding:'8px 6px', textAlign:'center' }}>{ROLE_LABELS[u.role] || u.role}</td>
                    <td style={{ padding:'8px 6px', textAlign:'center' }}>
                      <select
                        value={u.role}
                        onChange={e => changeRole(u.id, e.target.value)}
                        disabled={busy || u.id === user.id}
                      >
                        <option value="user">Contributor</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Section>
  );
}
