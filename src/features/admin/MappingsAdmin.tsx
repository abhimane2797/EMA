import { useEffect, useState, useMemo } from 'react';
import { Box, Paper, Button, TextField, Stack, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Alert, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import { mockApi } from '../../api/mockApi';
import { Mapping, Project, CostCenter } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { overlaps } from '../../utils';

export function MappingsAdmin(){
  const [rows,setRows]=useState<Mapping[]>([]);
  const [projects,setProjects]=useState<Project[]>([]);
  const [ccs,setCcs]=useState<CostCenter[]>([]);
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState<Mapping|null>(null);
  const [form,setForm]=useState<any>({ projectId:'', costCenterId:'', allocationPct:'', effectiveStart:'', effectiveEnd:'' });
  const [del,setDel]=useState<Mapping|null>(null);
  const [error,setError]=useState<string|null>(null);

  const load = async ()=>{ setRows(await mockApi.listMappings()); setProjects(await mockApi.listProjects()); setCcs(await mockApi.listCostCenters()); };
  useEffect(()=>{load();},[]);

  const totals = useMemo(()=>{
    const byCC:Record<string,number>={};
    rows.forEach(r=> byCC[r.costCenterId]=(byCC[r.costCenterId]||0)+ r.allocationPct);
    return byCC;
  },[rows]);

  // overlap warnings
  const overlapWarnings = useMemo(()=>{
    const warns:string[]=[];
    for(let i=0;i<rows.length;i++) for(let j=i+1;j<rows.length;j++) if(rows[i].projectId===rows[j].projectId && rows[i].costCenterId===rows[j].costCenterId && overlaps(rows[i].effectiveStart, rows[i].effectiveEnd, rows[j].effectiveStart, rows[j].effectiveEnd)) warns.push(`${rows[i].id} overlaps ${rows[j].id}`);
    return warns;
  },[rows]);

  const validate = () => {
    setError(null);
    const pct=Number(form.allocationPct);
    if (!form.projectId||!form.costCenterId) { setError('Project and Cost Center required'); return false; }
    if (isNaN(pct)|| pct<0|| pct>100) { setError('Allocation must be 0–100'); return false; }
    if (!form.effectiveStart||!form.effectiveEnd) { setError('Both dates required'); return false; }
    if (form.effectiveEnd < form.effectiveStart) { setError('End date must be after start'); return false; }
    // overlap check against existing (excluding editing)
    const others = rows.filter(r=> editing ? r.id!==editing.id : true);
    const hasOverlap = others.some(r=> r.projectId===form.projectId && r.costCenterId===form.costCenterId && overlaps(form.effectiveStart, form.effectiveEnd, r.effectiveStart, r.effectiveEnd));
    if (hasOverlap) { setError('Warning: This mapping overlaps an existing one for same Project + Cost Center'); /* not blocking, just warning */ }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload={ projectId:form.projectId, costCenterId:form.costCenterId, allocationPct:Number(form.allocationPct), effectiveStart:form.effectiveStart, effectiveEnd:form.effectiveEnd };
    if (editing) await mockApi.updateMapping(editing.id, payload); else await mockApi.createMapping(payload as any);
    setOpen(false); setEditing(null); setForm({projectId:'',costCenterId:'',allocationPct:'',effectiveStart:'',effectiveEnd:''}); load();
  };
  const startEdit=(m:Mapping)=>{ setEditing(m); setForm({projectId:m.projectId, costCenterId:m.costCenterId, allocationPct:String(m.allocationPct), effectiveStart:m.effectiveStart, effectiveEnd:m.effectiveEnd}); setOpen(true); setError(null); };
  const handleDelete=async()=>{ if(del){await mockApi.deleteMapping(del.id); setDel(null); load();}};

  return (
    <Box>
      <PageHeader title="Project – Cost Center Mappings" subtitle="Validate allocation totals =100% per Cost Center and date overlaps" breadcrumbs={[{label:'Admin',to:'/admin'},{label:'Mappings'}]} action={<Button variant="contained" onClick={()=>{setEditing(null); setForm({projectId:'',costCenterId:'',allocationPct:'',effectiveStart:'',effectiveEnd:''}); setOpen(true); setError(null);}}>Add Mapping</Button>} />

      {!!Object.keys(totals).length && (
        <Paper sx={{p:2, mb:2}}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Allocation totals per Cost Center (must be 100%)</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {Object.entries(totals).map(([ccId,tot])=> {
              const cc=ccs.find(c=>c.id===ccId);
              const ok=tot===100;
              return <Chip key={ccId} label={`${cc?.name||ccId}: ${tot}%`} color={ok?'success':'warning'} icon={!ok? <WarningIcon/>: undefined} />;
            })}
          </Stack>
          {Object.values(totals).some(v=>v!==100) && <Alert severity="warning" sx={{mt:1.5, fontSize:13}}>Some cost centers do not sum to 100%. Please adjust allocations.</Alert>}
        </Paper>
      )}
      {!!overlapWarnings.length && <Alert severity="warning" sx={{ mb:2 }}>Overlap detected: {overlapWarnings.join('; ')}</Alert>}

      <Paper sx={{p:2}}>
        <Stack spacing={1}>
          {rows.map(r=> (
            <Paper key={r.id} variant="outlined" sx={{p:1.5, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <Box>
                <Typography fontWeight={700} fontSize={14}>{r.projectName} → {r.costCenterName} — {r.allocationPct}%</Typography>
                <Typography variant="caption" color="text.secondary">{r.effectiveStart} → {r.effectiveEnd}</Typography>
              </Box>
              <Stack direction="row" spacing={0.5}><IconButton size="small" onClick={()=>startEdit(r)}><EditIcon fontSize="small"/></IconButton><IconButton size="small" color="error" onClick={()=>setDel(r)}><DeleteIcon fontSize="small"/></IconButton></Stack>
            </Paper>
          ))}
          {!rows.length && <Typography color="text.secondary" textAlign="center" py={4}>No mappings</Typography>}
        </Stack>
      </Paper>

      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?'Edit':'Add'} Mapping</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {error && <Alert severity={error.startsWith('Warning')?'warning':'error'}>{error}</Alert>}
            <TextField select label="Project *" value={form.projectId} onChange={e=>setForm({...form, projectId:e.target.value})} size="small">{projects.map(p=> <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
            <TextField select label="Cost Center *" value={form.costCenterId} onChange={e=>setForm({...form, costCenterId:e.target.value})} size="small">{ccs.map(c=> <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>
            <TextField label="Allocation %" type="number" value={form.allocationPct} onChange={e=>setForm({...form, allocationPct:e.target.value})} size="small" inputProps={{min:0,max:100}} helperText="0–100" />
            <TextField label="Effective Start" type="date" InputLabelProps={{shrink:true}} value={form.effectiveStart} onChange={e=>setForm({...form, effectiveStart:e.target.value})} size="small" />
            <TextField label="Effective End" type="date" InputLabelProps={{shrink:true}} value={form.effectiveEnd} onChange={e=>setForm({...form, effectiveEnd:e.target.value})} size="small" />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={()=>setOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleSave}>Save</Button></DialogActions>
      </Dialog>
      <ConfirmDialog open={!!del} title="Delete mapping?" message="Delete this mapping?" onConfirm={handleDelete} onClose={()=>setDel(null)} danger />
    </Box>
  );
}
