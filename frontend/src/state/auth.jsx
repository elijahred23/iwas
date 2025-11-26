import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const Ctx = createContext({ user: null, loading: true, login: () => {}, logout: () => {} });

export const AuthAPI = {
  changePassword: async (current_password, new_password) => {
    const { data } = await api.post('/auth/change-password', { current_password, new_password });
    return data;
  },
  listUsers: async () => {
    const { data } = await api.get('/auth/users');
    return data;
  },
  updateUserRole: async (userId, role) => {
    const { data } = await api.patch(`/auth/users/${userId}/role`, { role });
    return data;
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-check session on first load (reads JWT cookie on the API)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (alive && data?.ok) setUser(data.user);
      } catch (_) {
        // not logged in; ignore
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // After a successful login call, set the user
  const login = (u) => setUser(u);

  // Call API to clear cookie and drop user from context
  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
export const useCan = (roles) => {
  const { user } = useAuth();
  return !!user && roles.includes(user.role);
};
