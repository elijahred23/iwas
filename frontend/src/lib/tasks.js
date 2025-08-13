import { api } from './api';

// Tasks scoped under workflows
export const TasksAPI = {
  list: (workflowId) =>
    api.get(`/workflows/${workflowId}/tasks`).then(r => r.data),
  create: (workflowId, payload) =>
    api.post(`/workflows/${workflowId}/tasks`, payload).then(r => r.data),
  update: (taskId, patch) =>
    api.patch(`/workflows/tasks/${taskId}`, patch).then(r => r.data),
  remove: (taskId) =>
    api.delete(`/workflows/tasks/${taskId}`).then(r => r.data),
};
