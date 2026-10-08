import { useState } from 'react';
import { Box, Paper, TextField, Button, Typography, InputAdornment, IconButton, Alert, Stack, Divider, Chip } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ShieldIcon from '@mui/icons-material/Shield';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { mockApi } from '../../api/mockApi';
import { useAuthStore } from '../../store/authStore';
import { isPasswordExpired } from '../../utils';

const schema = z.object({
  loginId: z.string().min(2, 'Login ID is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [info, setInfo] = useState<string|null>(null);
  const navigate = useNavigate();
  const loginStore = useAuthStore(s=>s.login);

  const { register, handleSubmit, formState:{ errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues:{ loginId:'', password:'' } });

  const onSubmit = async (vals: FormValues) => {
    setError(null); setInfo(null);
    try {
      const res = await mockApi.login(vals.loginId, vals.password);
      if ((res as any).passwordExpired) {
        // store temp and go to change password
        localStorage.setItem('ema_temp_user', JSON.stringify((res as any).user));
        navigate('/change-password', { state:{ user:(res as any).user, expired:true } });
        return;
      }
      loginStore((res as any).user, (res as any).token);
      navigate('/tasks');
    } catch (e:any) {
      const msg = e?.response?.data?.message || e?.message || 'Login failed';
      setError(msg);
    }
  };

  const fillDemo = (id:string) => {
    // helper to quick fill
    const el1 = document.querySelector<HTMLInputElement>('input[name="loginId"]');
    const el2 = document.querySelector<HTMLInputElement>('input[name="password"]');
    if (el1 && el2) { el1.value=id; el2.value='Password@123'; el1.dispatchEvent(new Event('input',{bubbles:true})); el2.dispatchEvent(new Event('input',{bubbles:true})); }
  };

  return (
    <Box sx={{ minHeight:'100vh', display:'flex', flexDirection:{ xs:'column', md:'row' } }}>
      {/* Branding panel */}
      <Box sx={{
        flex: { md:'0 0 46%' }, bgcolor:'primary.main', color:'#fff', p:{ xs:4, md:6 },
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        background: 'linear-gradient(135deg, #1A56DB 0%, #0E2A6B 100%)', position:'relative', overflow:'hidden'
      }}>
        <Box sx={{ position:'absolute', top:-60, right:-60, width:300, height:300, borderRadius:'50%', bgcolor:'rgba(255,255,255,0.08)' }} />
        <Box sx={{ position:'absolute', bottom:-40, left:-40, width:220, height:220, borderRadius:'50%', bgcolor:'rgba(255,255,255,0.06)' }} />
        <Box position="relative">
          <Stack direction="row" spacing={1.2} alignItems="center" mb={4}>
            <Box sx={{ width:44, height:44, borderRadius:2, bgcolor:'#fff', color:'primary.main', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>FSL</Box>
            <Box>
              <Typography fontWeight={800} fontSize={18}>Gov EMA</Typography>
              <Typography variant="caption" sx={{ opacity:0.85 }}>Forensic Science Laboratory</Typography>
            </Box>
          </Stack>
          <Chip label="Government of Maharashtra" size="small" sx={{ bgcolor:'rgba(255,255,255,0.18)', color:'#fff', mb:2 }} />
          <Typography variant="h4" fontWeight={800} lineHeight={1.1} mb={2}>Computerization<br/>of Forensic Science<br/>Laboratory</Typography>
          <Typography variant="body2" sx={{ opacity:0.9, maxWidth:420 }}>
            Enterprise Project, Task & Budget management for the IT implementation team. Secure, role-based and audit-ready.
          </Typography>
          <Stack spacing={1.2} mt={4} maxWidth={420}>
            {['Role-based access control','Task & budget tracking with Gantt & KPIs','Audit trail for comments & attachments'].map(t=> (
              <Stack key={t} direction="row" spacing={1} alignItems="center"><ShieldIcon fontSize="small" sx={{ opacity:0.9 }} /><Typography variant="body2" sx={{ opacity:0.95 }}>{t}</Typography></Stack>
            ))}
          </Stack>
        </Box>
        <Typography variant="caption" sx={{ opacity:0.7, position:'relative' }}>© 2024 Forensic Science Laboratory • v1.0.0 • Secure access only</Typography>
      </Box>

      {/* Form panel */}
      <Box sx={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', p:{ xs:3, md:6 }, bgcolor:'background.default' }}>
        <Paper sx={{ width:'100%', maxWidth:440, p:{ xs:3, md:4 }, borderRadius:3 }} elevation={0}>
          <Typography variant="h5" fontWeight={800}>Sign in</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Use your Login ID and password to continue.</Typography>

          {error && <Alert severity="error" sx={{ mt:2 }}>{error}</Alert>}
          {info && <Alert severity="info" sx={{ mt:2 }}>{info}</Alert>}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} mt={3} noValidate>
            <TextField fullWidth label="Login ID" placeholder="e.g. pratik.mulgir" {...register('loginId')} error={!!errors.loginId} helperText={errors.loginId?.message} margin="normal" autoFocus />
            <TextField fullWidth label="Password" type={showPwd?'text':'password'} {...register('password')} error={!!errors.password} helperText={errors.password?.message} margin="normal"
              InputProps={{
                endAdornment: <InputAdornment position="end"><IconButton edge="end" onClick={()=>setShowPwd(v=>!v)}>{showPwd ? <VisibilityOff/> : <Visibility/>}</IconButton></InputAdornment>
              }}
            />
            <Button fullWidth type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ mt:2, py:1.3 }}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
            <Typography variant="caption" color="text.secondary" display="block" mt={1.5} textAlign="center">Demo password for all users: <b>Password@123</b></Typography>
          </Box>

          <Divider sx={{ my:3 }} />

          <Typography variant="caption" fontWeight={700} color="text.secondary">QUICK DEMO LOGINS — click to fill</Typography>
          <Stack spacing={1} mt={1.5}>
            {[
              { id:'rishikesh.oza', label:'Rishikesh Oza — Operations Manager (Director)', color:'primary' },
              { id:'pratik.mulgir', label:'Pratik Mulgir — Project Manager', color:'secondary' },
              { id:'gaurav.bhangale', label:'Gaurav Bhangale — Technical Member', color:'default' },
              { id:'ananya.singh', label:'Ananya Singh — Expired password (90d)', color:'warning' },
              { id:'vikas.patil', label:'Vikas Patil — Inactive account', color:'error' },
            ].map(u=> (
              <Button key={u.id} variant="outlined" size="small" onClick={()=>{
                // set values via DOM + react-hook-form set? Simpler: navigate with prefill? We'll just set via form API by reloading? Use hack: set input values then submit programmatically requires trigger
                const loginInput = document.querySelector<HTMLInputElement>('input[name="loginId"]');
                const pwdInput = document.querySelector<HTMLInputElement>('input[name="password"]');
                if (loginInput && pwdInput) {
                  // need to use native value setter + dispatch input event for RHF
                  const setVal = (el: HTMLInputElement, val: string) => {
                    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
                    const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
                    if (setter && proto) { setter.call(el, val); } else el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                  };
                  setVal(loginInput, u.id);
                  setVal(pwdInput, 'Password@123');
                }
              }} sx={{ justifyContent:'flex-start', textTransform:'none', fontSize:12 }}>{u.label}</Button>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
