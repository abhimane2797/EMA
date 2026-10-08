import axios from 'axios';

const baseURL = (import.meta as any).env?.VITE_API_BASE_URL?.trim() || '';

export const apiClient = axios.create({
  baseURL: baseURL || '/api/mock',
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ema_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ema_token');
      localStorage.removeItem('ema_user');
      // redirect to login only if not already there
      if (!location.pathname.includes('/login')) {
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const isMockMode = !baseURL;
