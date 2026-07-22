import api from './api';

export const statsService = {
  getStatistics: async () => {
    const response = await api.get('/statistics');
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/statistics/analytics');
    return response.data;
  },
};
