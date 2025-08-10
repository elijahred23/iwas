import axios from "axios";

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Optional: auto-handle 401s
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // you can redirect to /login here if you want
    }
    return Promise.reject(err);
  }
);
