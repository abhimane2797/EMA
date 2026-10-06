import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => {
    localStorage.setItem('ema_token', token);
    localStorage.setItem('ema_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('ema_token');
    localStorage.removeItem('ema_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  setUser: (user) => {
    localStorage.setItem('ema_user', JSON.stringify(user));
    set({ user });
  },
  hydrate: () => {
    const token = localStorage.getItem('ema_token');
    const raw = localStorage.getItem('ema_user');
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as User;
        // backfill module flags added after the session was persisted
        const stored = (user.access || {}) as Partial<User['access']>;
        user.access = {
          projectManagement: stored.projectManagement ?? true,
          taskManagement: stored.taskManagement ?? true,
          assetManagement: stored.assetManagement ?? true,
          incidentManagement: stored.incidentManagement ?? true,
          ticketManagement: stored.ticketManagement ?? true,
          reportsDashboard: stored.reportsDashboard ?? true,
        };
        set({ user, token, isAuthenticated: true });
      } catch {}
    }
  }
}));
