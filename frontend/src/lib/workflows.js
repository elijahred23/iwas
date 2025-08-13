// frontend/src/lib/workflows.js
import { api } from './api';

export const WorkflowsAPI = {
  list: (params = {}) =>
    api.get('/workflows', { params }).then(r => r.data),         // {ok, items, total}
  create: (payload) =>
    api.post('/workflows', payload).then(r => r.data),           // {ok, item}
  get: (id) =>
    api.get(`/workflows/${id}`).then(r => r.data),               // {ok, item}
  update: (id, payload) =>
    api.patch(`/workflows/${id}`, payload).then(r => r.data),    // {ok, item}
  remove: (id) =>
    api.delete(`/workflows/${id}`).then(r => r.data),            // {ok, deleted}
};
