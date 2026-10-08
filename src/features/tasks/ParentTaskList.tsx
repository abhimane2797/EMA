import { useEffect, useState, useMemo } from 'react';
import { Box, Paper, TextField, Stack, MenuItem, Button, Chip, Typography, LinearProgress, Skeleton } from '@mui/material';
import { DataTable, Column } from '../../components/DataTable';
import { StatusChip, PriorityChip, SeverityChip } from '../../components/StatusChip';
import { api } from '../../api';
import { ParentTask, Priority } from '../../types';
import { fmtDate } from '../../utils';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ParentTaskList() {
  const user = useAuthStore(s=>s.user)!;
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [severity, setSeverity] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [rows, setRows] = useState<ParentTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>(['Low','Medium','High','Critical']);

  useEffect(()=>{
    api.getTaskMeta()
      .then(m=> { setLocations(m.locations); setPriorities(m.priorities as Priority[]); })
      .catch(()=> {});
  }, []);

  const fetch = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.listParents({ q: q||undefined, status: status||undefined, priority: priority||undefined, severity: severity||undefined, location: location||undefined, page, pageSize, sortBy:'dueDate', sortDir, forUserId: user.id });
      setRows(res.data); setTotal(res.total);
    } catch (e:any) { setError(e.message||'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ fetch(); }, [q, status, priority, severity, location, page, pageSize, sortDir]);

  const columns: Column<ParentTask>[] = [
    { id:'id', label:'Task ID', minWidth:110, render: r=> <Typography variant="body2" fontWeight={700} color="primary.main">{r.id}</Typography> },
    { id:'title', label:'Title', minWidth:240, render: r=> <Box><Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth:260 }}>{r.title}</Typography><Typography variant="caption" color="text.secondary">{r.assetCategory} • {r.location}</Typography></Box> },
    { id:'priority', label:'Priority', render: r=> <PriorityChip priority={r.priority} /> },
    { id:'severity', label:'Severity', render: r=> <SeverityChip severity={r.severity} /> },
    { id:'status', label:'Status', render: r=> <StatusChip status={r.status} /> },
    { id:'dueDate', label:'Due Date', render: r=> fmtDate(r.dueDate) },
    { id:'progress', label:'Progress', render: r=> <Box sx={{ width:90 }}><Stack direction="row" spacing={1} alignItems="center"><LinearProgress variant="determinate" value={r.progress} sx={{ flex:1, height:6, borderRadius:1 }} /><Typography variant="caption">{r.progress}%</Typography></Stack></Box> },
    { id:'ownerName', label:'Owner' },
  ];

  return (
    <Box>
      <Paper sx={{ p:2, mb:2 }}>
        <Stack direction={{ xs:'column', md:'row' }} spacing={1.5} alignItems={{ md:'center' }} flexWrap="wrap">
          <TextField size="small" placeholder="Search Task ID / Title / Category" value={q} onChange={e=>{setQ(e.target.value); setPage(1);}} sx={{ minWidth:260, flex:1 }} />
          <TextField select size="small" label="Status" value={status} onChange={e=>{setStatus(e.target.value); setPage(1);}} sx={{ minWidth:140 }}><MenuItem value="">All</MenuItem>{['New','In Progress','On Hold','Blocked','Completed'].map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          <TextField select size="small" label="Priority" value={priority} onChange={e=>{setPriority(e.target.value); setPage(1);}} sx={{ minWidth:140 }}><MenuItem value="">All</MenuItem>{priorities.map(p=> <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField>
          <TextField select size="small" label="Severity" value={severity} onChange={e=>{setSeverity(e.target.value); setPage(1);}} sx={{ minWidth:130 }}><MenuItem value="">All</MenuItem>{['Low','Medium','High','Critical'].map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          <TextField select size="small" label="Location" value={location} onChange={e=>{setLocation(e.target.value); setPage(1);}} sx={{ minWidth:150 }}><MenuItem value="">All</MenuItem>{locations.map(l=> <MenuItem key={l} value={l}>{l}</MenuItem>)}</TextField>
          <Button variant="outlined" onClick={()=>{setQ('');setStatus('');setPriority('');setSeverity('');setLocation('');setPage(1);}}>Clear</Button>
        </Stack>
        <Stack direction="row" spacing={1} mt={1.5} alignItems="center">
          <Typography variant="caption" color="text.secondary">{total} parent tasks • Sorted by Due Date</Typography>
          <Button size="small" onClick={()=> setSortDir(d=> d==='asc'?'desc':'asc')}>Sort: {sortDir==='asc'?'Oldest ↑':'Newest ↓'}</Button>
        </Stack>
      </Paper>

      {error ? (
        <Paper sx={{ p:4, textAlign:'center' }}><Typography color="error">{error}</Typography><Button sx={{mt:1}} onClick={fetch}>Retry</Button></Paper>
      ) : (
        <DataTable columns={columns} rows={rows} total={total} page={page} pageSize={pageSize} onPageChange={setPage} onRowsPerPageChange={setPageSize} loading={loading} emptyText="No parent tasks match your filters." onRowClick={(r)=> navigate(`/tasks/parent/${r.id}`)} />
      )}
    </Box>
  );
}
