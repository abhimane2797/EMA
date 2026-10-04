import { useEffect, useState } from 'react';
import { Box, Paper, Button, TextField, Stack, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Chip, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyIcon from '@mui/icons-material/Key';
import { mockApi } from '../../api/mockApi';
import { User } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { fmtDate } from '../../utils';

export function UsersAdmin(){
  const [rows,setRows]=useState<User[]>([]);
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<User|null>(null);
  const [form,setForm]=useState<any>({ loginId:'', employeeName:'', designation:'', role:'Technical Team Member', projectId:'proj-1', status:'Active', effectiveEndDate:'' });
  const [del,setDel]=useState<User|null>(null);
  const [resetMsg,setResetMsg]=useState<string|null>(null);

  const load=async()=> setRows(await mockApi.listUsers());
  useEffect(()=>{load();},[]);

  const handleSave=async()=>{
    if(!form.loginId.trim()||!form.employeeName.trim()) return;
    if(editing) await mockApi.updateUser(editing.id, { ...form, projectName: undefined } as any);
    else await mockApi.createUser(form as any);
    setOpen(false); setEditing(null); setForm({loginId:'',employeeName:'',designation:'',role:'Technical Team Member',projectId:'proj-1',status:'Active',effectiveEndDate:''}); load();
  };
  const startEdit=(u:User)=>{setEditing(u); setForm({loginId:u.loginId, employeeName:u.employeeName, designation:u.designation, role:u.role, projectId:u.projectId, status:u.status, effectiveEndDate:u.effectiveEndDate||''}); setOpen(true);};
  const handleDelete=async()=>{ if(del){await mockApi.deleteUser(del.id); setDel(null); load();}};
  const handleReset=async(u:User)=>{ await mockApi.resetPassword(u.id); setResetMsg(`Password reset for ${u.employeeName} — default password applied. User must change on next login.`); setTimeout(()=>setResetMsg(null),4000); };

  return (
    <Box>
      <PageHeader title="Users" subtitle="Employee master — passwords are never shown. Use Reset password action." breadcrumbs={[{label:'Admin',to:'/admin'},{label:'Users'}]} action={<Button variant="contained" onClick={()=>{setEditing(null); setForm({loginId:'',employeeName:'',designation:'',role:'Technical Team Member',projectId:'proj-1',status:'Active',effectiveEndDate:''}); setOpen(true);}}>Add User</Button>} />
      {resetMsg && <Alert severity="success" sx={{ mb:2 }}>{resetMsg}</Alert>}
      <Paper sx={{p:2}}>
        <Stack spacing={1}>
          {rows.map(u=> (
            <Paper key={u.id} variant="outlined" sx={{p:1.5}}>
              <Stack direction={{xs:'column', md:'row'}} justifyContent="space-between" spacing={1}>
                <Box flex={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={700}>{u.employeeName}</Typography>
                    <Chip size="small" label={u.role} color={u.role==='Operations Manager'?'primary': u.role==='Project Manager'?'secondary':'default'} />
                    <Chip size="small" label={u.status} color={u.status==='Active'?'success':'default'} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{u.designation} • {u.loginId} • {u.projectName} • Created: {fmtDate(u.createdAt)} {u.effectiveEndDate? `• End: ${fmtDate(u.effectiveEndDate)}`:''}</Typography>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <IconButton size="small" onClick={()=>handleReset(u)} title="Reset password"><KeyIcon fontSize="small"/></IconButton>
                  <IconButton size="small" onClick={()=>startEdit(u)}><EditIcon fontSize="small"/></IconButton>
                  <IconButton size="small" color="error" onClick={()=>setDel(u)}><DeleteIcon fontSize="small"/></IconButton>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?'Edit':'Add'} User</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} mt={1}>
            <TextField label="Login ID *" value={form.loginId} onChange={e=>setForm({...form, loginId:e.target.value})} size="small" />
            <TextField label="Employee Name *" value={form.employeeName} onChange={e=>setForm({...form, employeeName:e.target.value})} size="small" />
            <TextField label="Designation" value={form.designation} onChange={e=>setForm({...form, designation:e.target.value})} size="small" />
            <TextField select label="Role" value={form.role} onChange={e=>setForm({...form, role:e.target.value})} size="small"><MenuItem value="Operations Manager">Operations Manager</MenuItem><MenuItem value="Project Manager">Project Manager</MenuItem><MenuItem value="Technical Team Member">Technical Team Member</MenuItem></TextField>
            <TextField select label="Project" value={form.projectId} onChange={e=>setForm({...form, projectId:e.target.value})} size="small"><MenuItem value="proj-1">Computerization of FSL</MenuItem><MenuItem value="proj-2">Network Upgrade - Maharashtra</MenuItem><MenuItem value="proj-3">Training & Capacity Building</MenuItem></TextField>
            <TextField select label="Status" value={form.status} onChange={e=>setForm({...form, status:e.target.value})} size="small"><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField>
            <TextField label="Effective End Date" type="date" InputLabelProps={{shrink:true}} value={form.effectiveEndDate} onChange={e=>setForm({...form, effectiveEndDate:e.target.value})} size="small" />
            <Alert severity="info" sx={{ fontSize:12 }}>Passwords are never displayed. Use "Reset password" to set a default password for the user.</Alert>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSave} disabled={!form.loginId.trim()||!form.employeeName.trim()}>Save</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} title="Delete user?" message={`Delete ${del?.employeeName}?`} onConfirm={handleDelete} onClose={()=>setDel(null)} danger />
    </Box>
  );
}
