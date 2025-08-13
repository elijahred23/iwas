import { api } from './api';

export const NotificationsAPI = {
  recent: async (params = {}) => {
    const res = await api.get('/notifications/recent', { params });
    return res.data;
  },
};
