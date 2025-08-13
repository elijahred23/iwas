import { api } from './api';

export const AnalyticsAPI = {
  summary: async () => (await api.get('/analytics/summary')).data,
  daily: async (opts = {}) => {
    const params = { days: 14, ...opts }; 
    return (await api.get('/analytics/daily', { params })).data;
  },
  statuses: () => api.get('/analytics/statuses').then(r => r.data),
  overdue: (limit = 8) => api.get(`/analytics/overdue?limit=${limit}`).then(r => r.data),
  recent: (limit = 10) => api.get(`/analytics/recent?limit=${limit}`).then(r => r.data),
  topWorkflows: (limit = 5) => api.get(`/analytics/workflows/top?limit=${limit}`).then(r => r.data),
};