import { createTheme, PaletteMode } from '@mui/material';

export const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    primary: { main: '#1A56DB', light: '#3B82F6', dark: '#1442A8', contrastText: '#fff' },
    secondary: { main: '#0E7490', light: '#06B6D4' },
    background: {
      default: mode === 'light' ? '#F3F5F9' : '#0F172A',
      paper: mode === 'light' ? '#FFFFFF' : '#1E293B',
    },
    text: {
      primary: mode === 'light' ? '#111827' : '#F1F5F9',
      secondary: mode === 'light' ? '#64748B' : '#94A3B8',
    },
    divider: mode === 'light' ? '#E2E8F0' : '#334155',
    success: { main: '#059669' },
    warning: { main: '#D97706' },
    error: { main: '#DC2626' },
    info: { main: '#2563EB' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none' as const, fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: mode==='light' ? '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' : 'none', border: `1px solid ${mode==='light' ? '#E2E8F0' : '#334155'}` } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 10, boxShadow: 'none' } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
    MuiAppBar: { styleOverrides: { root: { boxShadow: 'none', borderBottom: `1px solid ${mode==='light' ? '#E2E8F0' : '#334155'}` } } },
    MuiDrawer: { styleOverrides: { paper: { borderRight: `1px solid ${mode==='light' ? '#E2E8F0' : '#334155'}` } } },
  },
});

export const createAppTheme = (mode: PaletteMode) => createTheme(getDesignTokens(mode) as any);
