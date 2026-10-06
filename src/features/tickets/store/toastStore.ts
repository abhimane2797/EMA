import { create } from 'zustand';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  open: boolean;
  message: string;
  severity: Severity;
  show: (message: string, severity?: Severity) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  open: false,
  message: '',
  severity: 'info',
  show: (message, severity = 'info') => set({ open: true, message, severity }),
  hide: () => set({ open: false }),
}));

/** Fire a toast from anywhere (including non-reactive code paths). */
export const toast = (message: string, severity: Severity = 'info') => useToastStore.getState().show(message, severity);
