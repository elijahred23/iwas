// frontend/src/lib/workflows.js
import { api } from './api';

// GET /api/workflows?q=...&page=...&per_page=...
async function list(params = {}) {
  const { data } = await api.get('/workflows', { params });
  return data;
}

// POST /api/workflows/  (note the trailing slash to avoid 308 on some setups)
async function create(payload) {
  const { data } = await api.post('/workflows/', payload);
  return data;
}

async function get(id) {
  const { data } = await api.get(`/workflows/${id}`);
  return data;
}

async function remove(id) {
  const { data } = await api.delete(`/workflows/${id}`);
  return data;
}

export const WorkflowsAPI = { list, create, get, remove };
