import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const baseURL = (import.meta as any).env?.VITE_API_BASE_URL?.trim() || '';

/** `EMA_API_BASE_URL` is the NestJS service (global prefix `api/v1`). */
export const apiClient = axios.create({
  baseURL: baseURL || '/api/mock',
  timeout: 30000,
});

const ACCESS_KEY = 'ema_token';
const REFRESH_KEY = 'ema_refresh';

const clearSession = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('ema_user');
  localStorage.removeItem('ema_temp_user');
};

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type Retriable = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshInFlight: Promise<string | null> | null = null;

/** Rotates the access/refresh pair once and returns the new access token. */
const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(
        `${baseURL || ''}/auth/refresh`,
        { refreshToken },
        { timeout: 30000 },
      )
      .then((res) => {
        const access = res.data?.accessToken as string | undefined;
        const refresh = res.data?.refreshToken as string | undefined;
        if (!access) return null;
        localStorage.setItem(ACCESS_KEY, access);
        if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
        return access;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as Retriable | undefined;
    const status = err.response?.status;
    const url = config?.url ?? '';
    const isAuthCall =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    // A short-lived access token (15 min) is silently rotated once.
    if (status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${token}`;
        return apiClient.request(config);
      }
    }

    if (status === 401 && !isAuthCall) {
      clearSession();
      if (!location.pathname.includes('/login')) {
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export const isMockMode = !baseURL;
export { ACCESS_KEY, REFRESH_KEY, clearSession };
