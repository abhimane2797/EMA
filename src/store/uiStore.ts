import { create } from 'zustand';

type Mode = 'light' | 'dark';
interface UIState {
  mode: Mode;
  sidebarCollapsed: boolean;
  toggleMode: () => void;
  toggleSidebar: () => void;
  setSidebar: (v:boolean)=>void;
}

export const useUIStore = create<UIState>((set)=> ({
  mode: (localStorage.getItem('ema_mode') as Mode) || 'light',
  sidebarCollapsed: false,
  toggleMode: () => set(s=>{
    const next = s.mode==='light' ? 'dark' : 'light';
    localStorage.setItem('ema_mode', next);
    return { mode: next };
  }),
  toggleSidebar: () => set(s=> ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebar: (v)=> set({ sidebarCollapsed: v })
}));
