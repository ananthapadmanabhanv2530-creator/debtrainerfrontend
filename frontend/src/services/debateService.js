import api from './api';

export const debateService = {
  start: async (topic, category, difficulty, userSide, config = {}) => {
    const response = await api.post('/debate/start', {
      topic,
      category,
      difficulty,
      userSide,
      config,
    });
    return response.data;
  },

  sendMessage: async (debateId, message) => {
    const response = await api.post('/debate/message', {
      debateId,
      message,
    });
    return response.data;
  },

  end: async (debateId) => {
    const response = await api.post('/debate/end', { debateId });
    return response.data;
  },

  getHistory: async (params = {}) => {
    const response = await api.get('/debate/history', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/debate/${id}`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/debate/${id}`);
    return response.data;
  },

  requestHint: async (debateId, hintType) => {
    const response = await api.post('/debate/hint', {
      debateId,
      hintType,
    });
    return response.data;
  },
};

