import { api } from './api';

export const TasksAPI = {
  list: (wfId) =>
    api.get(`/workflows/${wfId}/tasks`).then(r => r.data),             
  create: (wfId, payload) =>
    api.post(`/workflows/${wfId}/tasks`, payload).then(r => r.data),   
  update: (taskId, patch) =>
    api.patch(`/workflows/tasks/${taskId}`, patch).then(r => r.data),  
  remove: (taskId) =>
    api.delete(`/workflows/tasks/${taskId}`).then(r => r.data),        
};
