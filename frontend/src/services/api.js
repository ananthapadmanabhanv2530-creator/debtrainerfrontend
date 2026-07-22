import axios from 'axios';
import { auth } from '../firebase/config';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject Firebase ID token (force-refresh to avoid stale tokens)
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      // Force refresh ensures we always send a valid, non-expired token
      const token = await user.getIdToken(true);
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only log unauthorized warnings; avoid forcing hard page reloads
    if (error.response?.status === 401) {
      console.warn('Unauthorized backend request:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default api;
