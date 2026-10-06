import { setupWorker } from 'msw/browser';
import { ticketHandlers } from './handlers/tickets';

/** Dev-only worker: serves /api/tickets/* while VITE_API_BASE_URL is unset. */
export const worker = setupWorker(...ticketHandlers);
