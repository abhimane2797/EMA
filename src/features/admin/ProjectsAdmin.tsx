import { useEffect, useState } from 'react';
import { Box, Paper, Button, TextField, Stack, Switch, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../../api';
import { Project } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export function ProjectsAdmin() {
  const [rows,setRows]=useState<Project[]>([]);
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<Project|null>(null);
  const [code,setCode]=useState(''); const [name,setName]=useState(''); const [active,setActive]=useState(true);
  const [del,setDel]=useState<Project|null>(null);

  const load = async ()=> setRows(await api.listProjects());
  useEffect(()=>{load();},[]);

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) return;
    if (editing) await api.updateProject(editing.id, { code, name, active });
    else await api.createProject({ code, name, active });
    setOpen(false); setEditing(null); setCode(''); setName(''); load();
  };
  const startEdit = (p:Project)=>{ setEditing(p); setCode(p.code); setName(p.name); setActive(p.active); setOpen(true); };
  const handleDelete = async ()=>{ if(del) { await api.deleteProject(del.id); setDel(null); load(); } };

  return (
    <Box>
      <PageHeader title="Projects" subtitle="Master data — Operations Manager only" breadcrumbs={[{label:'Admin', to:'/admin'},{label:'Projects'}]} action={<Button variant="contained" onClick={()=>{setEditing(null); setCode(''); setName(''); setActive(true); setOpen(true);}}>Add Project</Button>} />
      <Paper sx={{ p:2 }}>
        <Stack spacing={1}>
          {rows.map(r=> (
            <Paper key={r.id} variant="outlined" sx={{ p:1.5, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <Box><Typography fontWeight={700}>{r.code} — {r.name}</Typography><Typography variant="caption" color={r.active?'success.main':'text.secondary'}>{r.active ? 'Active' : 'Inactive'}</Typography></Box>
              <Stack direction="row" spacing={0.5}><IconButton size="small" onClick={()=>startEdit(r)}><EditIcon fontSize="small"/></IconButton><IconButton size="small" color="error" onClick={()=>setDel(r)}><DeleteIcon fontSize="small"/></IconButton></Stack>
            </Paper>
          ))}
          {!rows.length && <Typography color="text.secondary" textAlign="center" py={4}>No projects</Typography>}
        </Stack>
      </Paper>

      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?'Edit':'Add'} Project</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Code *" value={code} onChange={e=>setCode(e.target.value)} size="small" placeholder="e.g. FSL-COMP-01" />
            <TextField label="Name *" value={name} onChange={e=>setName(e.target.value)} size="small" />
            <Stack direction="row" alignItems="center" spacing={1}><Typography variant="body2">Active</Typography><Switch checked={active} onChange={(_,v)=>setActive(v)} /></Stack>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSave} disabled={!code.trim()||!name.trim()}>Save</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} title="Delete project?" message={`Delete ${del?.name}? This cannot be undone.`} onConfirm={handleDelete} onClose={()=>setDel(null)} danger confirmText="Delete" />
    </Box>
  );
}
