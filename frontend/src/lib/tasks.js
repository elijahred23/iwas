import { api } from './api';

export const TasksAPI = {
  list: (wfId) =>
    api.get(`/workflows/${wfId}/tasks`).then(r => r.data),             // { ok, items }
  create: (wfId, payload) =>
    api.post(`/workflows/${wfId}/tasks`, payload).then(r => r.data),   // { ok, item }
  update: (taskId, patch) =>
    api.patch(`/workflows/tasks/${taskId}`, patch).then(r => r.data),  // { ok, item }
  remove: (taskId) =>
    api.delete(`/workflows/tasks/${taskId}`).then(r => r.data),        // { ok: true }
};
