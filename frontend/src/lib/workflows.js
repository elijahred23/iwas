import { api } from './api';
// frontend/src/lib/workflows.js
export const WorkflowsAPI = {
  list: () => api.get('/workflows/').then(r => r.data),
  create: (body) => api.post('/workflows/', body).then(r => r.data),
  get: (id) => api.get(`/workflows/${id}`).then(r => r.data),
  remove: (id) => api.delete(`/workflows/${id}`).then(r => r.data),
};
