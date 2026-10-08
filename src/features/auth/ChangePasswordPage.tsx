import { Box, Paper, Typography, TextField, Button, Alert, InputAdornment, IconButton, Stack } from '@mui/material';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { api } from '../../api';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  oldPassword: z.string().min(1,'Current password required'),
  newPassword: z.string().min(8,'Min 8 characters').regex(/[A-Z]/,'Need uppercase').regex(/[0-9]/,'Need number'),
  confirm: z.string().min(1,'Confirm password'),
}).refine(d=> d.newPassword===d.confirm, { message:'Passwords must match', path:['confirm'] });

type V = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateUser = (location.state as any)?.user;
  const tempRaw = localStorage.getItem('ema_temp_user');
  const user = stateUser || (tempRaw ? JSON.parse(tempRaw) : null);
  const [show,setShow]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);
  const [err,setErr]=useState<string|null>(null);
  const login = useAuthStore(s=>s.login);

  const { register, handleSubmit, formState:{ errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema) });

  const onSubmit = async (v:V) => {
    setErr(null); setMsg(null);
    try {
      if (!user) throw new Error('Session expired, please login again');
      await api.changePassword(user.id, v.oldPassword, v.newPassword);
      setMsg('Password changed successfully. Signing you in…');
      // auto login
      const res:any = await api.login(user.loginId, v.newPassword);
      login(res.user, res.token);
      localStorage.removeItem('ema_temp_user');
      setTimeout(()=> navigate('/tasks'), 800);
    } catch (e:any) {
      setErr(e.message || 'Failed to change password');
    }
  };

  return (
    <Box sx={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', p:3, bgcolor:'background.default' }}>
      <Paper sx={{ maxWidth:480, width:'100%', p:4, borderRadius:3 }}>
        <Typography variant="h5" fontWeight={800}>Change password</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Your password has expired (90 days). Please set a new password to continue.
        </Typography>
        <Alert severity="warning" sx={{ mt:2, fontSize:13 }}>Password must be 8+ chars, include uppercase and number. It cannot be reused.</Alert>
        {err && <Alert severity="error" sx={{ mt:2 }}>{err}</Alert>}
        {msg && <Alert severity="success" sx={{ mt:2 }}>{msg}</Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} mt={2} noValidate>
          <TextField fullWidth label="Current password" type={show?'text':'password'} {...register('oldPassword')} error={!!errors.oldPassword} helperText={errors.oldPassword?.message} margin="dense"
            InputProps={{ endAdornment:<InputAdornment position="end"><IconButton onClick={()=>setShow(v=>!v)} edge="end">{show ? <VisibilityOff/> : <Visibility/>}</IconButton></InputAdornment> }} />
          <TextField fullWidth label="New password" type={show?'text':'password'} {...register('newPassword')} error={!!errors.newPassword} helperText={errors.newPassword?.message} margin="dense" />
          <TextField fullWidth label="Confirm new password" type={show?'text':'password'} {...register('confirm')} error={!!errors.confirm} helperText={errors.confirm?.message} margin="dense" />
          <Button fullWidth type="submit" variant="contained" disabled={isSubmitting} sx={{ mt:2 }}>{isSubmitting?'Updating…':'Update password & sign in'}</Button>
          <Button fullWidth variant="text" sx={{ mt:1 }} onClick={()=> navigate('/login')}>Back to login</Button>
        </Box>
      </Paper>
    </Box>
  );
}
