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
    const token = getCookie('csrf_access_token');
    if (token) config.headers['X-CSRF-TOKEN'] = token;
  }
  return config;
});
