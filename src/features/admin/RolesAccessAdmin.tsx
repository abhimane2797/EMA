import { useEffect, useState } from 'react';
import { Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Switch, Chip, Stack, Alert, Button } from '@mui/material';
import { api, isMockMode } from '../../api';
import { User, ModuleKey } from '../../types';
import { PageHeader } from '../../components/PageHeader';

// The backend role_management matrix has five modules; Ticket Management is a
// frontend-only module and is therefore hidden in real-API mode.
const modules: {key:ModuleKey, label:string}[] = [
  { key:'projectManagement', label:'Project Mgmt' },
  { key:'taskManagement', label:'Task Mgmt' },
  ...(isMockMode ? [{ key:'ticketManagement' as ModuleKey, label:'Ticket Mgmt' }] : []),
  { key:'assetManagement', label:'Asset Mgmt' },
  { key:'incidentManagement', label:'Incident Mgmt' },
  { key:'reportsDashboard', label:'Reports' },
];

export function RolesAccessAdmin(){
  const [users,setUsers]=useState<User[]>([]);
  const [saving,setSaving]=useState<string|null>(null);
  const load=async()=> setUsers(await api.listUsers());
  useEffect(()=>{load();},[]);

  const [error,setError]=useState<string|null>(null);

  const toggle = async (u:User, mod:ModuleKey, val:boolean) => {
    setSaving(`${u.id}-${mod}`); setError(null);
    const newAccess = { ...u.access, [mod]: val };
    try {
      await api.updateUser(u.id, { access: newAccess } as any);
      setUsers(prev=> prev.map(x=> x.id===u.id ? { ...x, access: newAccess }: x));
    } catch (e:any) {
      setError(e?.message || 'Could not update module access');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Box>
      <PageHeader title="Roles & Access Matrix" subtitle="Yes/No toggles per user per module. Operations Manager can edit all." breadcrumbs={[{label:'Admin',to:'/admin'},{label:'Roles & Access'}]} />
      <Alert severity="info" sx={{ mb:2, fontSize:13 }}>Task Management is fully built; other modules show a "Coming soon" placeholder but are still gated by this matrix. Toggle takes effect immediately.</Alert>
      {error && <Alert severity="error" sx={{ mb:2 }}>{error}</Alert>}
      <Paper sx={{ overflowX:'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight:700, minWidth:220 }}>User (Role)</TableCell>
              {modules.map(m=> <TableCell key={m.key} align="center" sx={{ fontWeight:700 }}>{m.label}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u=> (
              <TableRow key={u.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{u.employeeName}</Typography>
                  <Stack direction="row" spacing={0.5} mt={0.3}><Chip label={u.role} size="small" variant="outlined" sx={{ fontSize:10 }} /><Typography variant="caption" color="text.secondary">{u.loginId}</Typography></Stack>
                </TableCell>
                {modules.map(m=> (
                  <TableCell key={m.key} align="center">
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                      <Typography variant="caption" color={u.access[m.key] ? 'success.main':'text.disabled'} fontWeight={700}>{u.access[m.key] ? 'Yes':'No'}</Typography>
                      <Switch size="small" checked={u.access[m.key]} onChange={(_,v)=> toggle(u,m.key,v)} disabled={!!saving} />
                    </Stack>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
