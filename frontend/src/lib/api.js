import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

function getCookie(name) {
  const m = document.cookie.match(`(?:^|; )${name}=([^;]*)`);
  return m ? decodeURIComponent(m[1]) : null;
}

api.interceptors.request.use((config) => {
  const needsCsrf = /post|put|patch|delete/i.test(config.method || '');
  if (needsCsrf) {
    const isRefresh = (config.url || '').includes('/auth/refresh');
    const token = getCookie(isRefresh ? 'csrf_refresh_token' : 'csrf_access_token');
    if (token) config.headers['X-CSRF-TOKEN'] = token;
  }
  return config;
});

// Auto refresh on 401 once per request
let refreshing = null;
api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const original = error.config || {};
    const status = error?.response?.status;
    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        await refreshing;
        refreshing = null;
        return api(original);
      } catch (e) {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);
