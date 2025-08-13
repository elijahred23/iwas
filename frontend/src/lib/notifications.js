import { api } from './api';

export const NotificationsAPI = {
  recent: async (params = {}) => (await api.get('/notifications/recent', { params })).data,
};
