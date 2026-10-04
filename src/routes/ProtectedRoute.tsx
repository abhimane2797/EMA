import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ReactNode } from 'react';
import { ModuleKey } from '../types';

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children ?? <Outlet />}</>;
}

export function RequireRole({ roles, children }: { roles: string[], children?: ReactNode }) {
  const user = useAuthStore(s=>s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Forbidden />;
  return <>{children ?? <Outlet />}</>;
}

export function RequireModule({ moduleKey, children }: { moduleKey: ModuleKey, children?: ReactNode }) {
  const user = useAuthStore(s=>s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role==='Operations Manager') return <>{children ?? <Outlet />}</>;
  if (!user.access[moduleKey]) return <Forbidden />;
  return <>{children ?? <Outlet />}</>;
}

export function Forbidden() {
  return (
    <Box sx={{ p:4, display:'flex', justifyContent:'center' }}>
      <Paper sx={{ p:4, maxWidth:480, width:'100%', textAlign:'center' }}>
        <Typography variant="h4" fontWeight={800}>403</Typography>
        <Typography color="text.secondary" mt={1}>You don't have permission to access this page.</Typography>
        <Button variant="contained" sx={{mt:2}} onClick={()=> history.back()}>Go back</Button>
      </Paper>
    </Box>
  );
}
