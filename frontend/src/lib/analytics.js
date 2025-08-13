import { api } from './api';

export const AnalyticsAPI = {
  summary: () => api.get('/analytics/summary').then(r => r.data),
  daily: (days = 30) => api.get(`/analytics/daily?days=${days}`).then(r => r.data),
  statuses: () => api.get('/analytics/statuses').then(r => r.data),
  overdue: (limit = 8) => api.get(`/analytics/overdue?limit=${limit}`).then(r => r.data),
  recent: (limit = 10) => api.get(`/analytics/recent?limit=${limit}`).then(r => r.data),
  topWorkflows: (limit = 5) => api.get(`/analytics/workflows/top?limit=${limit}`).then(r => r.data),
};
``