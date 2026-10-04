import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material';
import { createAppTheme } from './theme';
import { router } from './routes';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus:false } }
});

function App(){
  const hydrate = useAuthStore(s=>s.hydrate);
  const mode = useUIStore(s=>s.mode);
  const theme = useMemo(()=> createAppTheme(mode), [mode]);
  useEffect(()=>{ hydrate(); }, [hydrate]);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <GlobalStyles styles={{ body:{ backgroundColor: theme.palette.background.default } }} />
          <RouterProvider router={router} />
        </LocalizationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
