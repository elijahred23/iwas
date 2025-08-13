import { api } from './api';
export const AnalyticsAPI = {
  summary: async () => (await api.get('/analytics/summary')).data,
  daily: async (days=14) => (await api.get(`/analytics/daily?days=${days}`)).data,
};
