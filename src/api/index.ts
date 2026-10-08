import { mockApi } from './mockApi';
import { backendApi } from './backendApi';
import { isMockMode } from './client';

/**
 * Mode-aware API client.
 *
 * - `VITE_API_BASE_URL` unset  -> in-memory mock (`src/api/mockApi.ts`).
 * - `VITE_API_BASE_URL` set    -> the real NestJS backend (`master_backend`).
 *
 * Both implementations expose the same methods, so screens are agnostic.
 */
export const api: typeof mockApi = isMockMode ? mockApi : backendApi;

export { isMockMode };
export { ApiRequestError, DEFAULT_PASSWORD } from './backendApi';
