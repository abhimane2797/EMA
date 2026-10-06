import axios, { Method } from 'axios';
import { isMockMode } from '../../../api/client';
import { isMswActive } from '../../../mocks/mswStatus';

const base = ((import.meta as any).env?.VITE_API_BASE_URL?.trim() || '');

/** Every ticket endpoint is `/api/tickets…` — swap for a real backend with VITE_API_BASE_URL. */
export const ticketClient = axios.create({ baseURL: `${base}/api`, timeout: 15000 });

ticketClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ema_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

ticketClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !location.pathname.includes('/login')) {
      localStorage.removeItem('ema_token');
      localStorage.removeItem('ema_user');
      location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/** HTTP when a real backend is configured or MSW is up, otherwise the in-memory store. */
export const ticketHttpEnabled = () => !isMockMode || isMswActive();

export const qs = (params: Record<string, any> = {}): string => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) { if (value.length) value.forEach(v => sp.append(key, String(v))); return; }
    if (typeof value === 'object') { sp.append(key, JSON.stringify(value)); return; }
    sp.append(key, String(value));
  });
  const out = sp.toString();
  return out ? `?${out}` : '';
};

export const request = async <T>(method: Method, path: string, body?: any, local?: () => T): Promise<T> => {
  if (!ticketHttpEnabled()) {
    if (!local) throw new Error(`No local handler for ${method} ${path}`);
    return local();
  }
  const res = await ticketClient.request<T>({ method, url: path, data: body });
  return res.data;
};
