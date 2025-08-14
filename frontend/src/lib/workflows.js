import { api } from './api';

export const WorkflowsAPI = {
  list: async (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.q) params.set('q', opts.q);
    if (opts.page) params.set('page', String(opts.page));
    if (opts.per_page) params.set('per_page', String(opts.per_page));
    const qs = params.toString();
    const { data } = await api.get(`/workflows${qs ? `?${qs}` : ''}`);
    return data;
  },

  get: async (id) => {
    const { data } = await api.get(`/workflows/${id}`); // <-- no ":id"
    return data;
  },

  create: async (payload) => {
    const { data } = await api.post('/workflows', payload); // no trailing slash
    return data;
  },

  remove: async (id) => {
    const { data } = await api.delete(`/workflows/${id}`);
    return data;
  },
};

