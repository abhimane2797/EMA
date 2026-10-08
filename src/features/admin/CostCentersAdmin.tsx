import { useEffect, useState } from 'react';
import { Box, Paper, Button, TextField, Stack, Switch, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../../api';
import { CostCenter } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export function CostCentersAdmin(){
  const [rows,setRows]=useState<CostCenter[]>([]);
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<CostCenter|null>(null);
  const [code,setCode]=useState(''); const [name,setName]=useState(''); const [active,setActive]=useState(true);
  const [del,setDel]=useState<CostCenter|null>(null);
  const load = async ()=> setRows(await api.listCostCenters());
  useEffect(()=>{load();},[]);
  const handleSave = async () => {
    if (!code.trim()||!name.trim()) return;
    if (editing) await api.updateCostCenter(editing.id,{code,name,active}); else await api.createCostCenter({code,name,active});
    setOpen(false); setEditing(null); setCode(''); setName(''); load();
  };
  const startEdit=(p:CostCenter)=>{setEditing(p); setCode(p.code); setName(p.name); setActive(p.active); setOpen(true);};
  const handleDelete=async()=>{ if(del){await api.deleteCostCenter(del.id); setDel(null); load();}};
  return (
    <Box>
      <PageHeader title="Cost Centers" subtitle="Finance masters" breadcrumbs={[{label:'Admin',to:'/admin'},{label:'Cost Centers'}]} action={<Button variant="contained" onClick={()=>{setEditing(null); setCode(''); setName(''); setActive(true); setOpen(true);}}>Add Cost Center</Button>} />
      <Paper sx={{p:2}}>
        <Stack spacing={1}>
          {rows.map(r=> (
            <Paper key={r.id} variant="outlined" sx={{ p:1.5, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <Box><Typography fontWeight={700}>{r.code} — {r.name}</Typography><Typography variant="caption" color={r.active?'success.main':'text.secondary'}>{r.active?'Active':'Inactive'}</Typography></Box>
              <Stack direction="row" spacing={0.5}><IconButton size="small" onClick={()=>startEdit(r)}><EditIcon fontSize="small"/></IconButton><IconButton size="small" color="error" onClick={()=>setDel(r)}><DeleteIcon fontSize="small"/></IconButton></Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>
      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?'Edit':'Add'} Cost Center</DialogTitle>
        <DialogContent><Stack spacing={2} mt={1}><TextField label="Code *" value={code} onChange={e=>setCode(e.target.value)} size="small"/><TextField label="Name *" value={name} onChange={e=>setName(e.target.value)} size="small"/><Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">Active</Typography><Switch checked={active} onChange={(_,v)=>setActive(v)}/></Stack></Stack></DialogContent>
        <DialogActions><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSave} disabled={!code.trim()||!name.trim()}>Save</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} title="Delete cost center?" message={`Delete ${del?.name}?`} onConfirm={handleDelete} onClose={()=>setDel(null)} danger />
    </Box>
  );
}
