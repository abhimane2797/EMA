import { useEffect, useState } from 'react';
import { Box, Paper, TextField, Stack, MenuItem, Button, Typography } from '@mui/material';
import { DataTable, Column } from '../../components/DataTable';
import { StatusChip } from '../../components/StatusChip';
import { mockApi } from '../../api/mockApi';
import { ChildTask } from '../../types';
import { useNavigate } from 'react-router-dom';
import { fmtDate } from '../../utils';

export function ChildTaskList() {
  const navigate = useNavigate();
  const [q,setQ]=useState(''); const [status,setStatus]=useState(''); const [page,setPage]=useState(1); const [pageSize,setPageSize]=useState(10);
  const [rows,setRows]=useState<ChildTask[]>([]); const [total,setTotal]=useState(0); const [loading,setLoading]=useState(true); const [error,setError]=useState<string|null>(null);

  const fetch = async () => {
    setLoading(true); setError(null);
    try { const r=await mockApi.listChildren({ q: q||undefined, status: status||undefined, page, pageSize }); setRows(r.data); setTotal(r.total); } catch(e:any){ setError(e.message); } finally{ setLoading(false); }
  };
  useEffect(()=>{fetch();}, [q, status, page, pageSize]);

  const columns: Column<ChildTask>[] = [
    { id:'id', label:'Task ID', render:r=> <Typography variant="body2" fontWeight={700} color="primary.main">{r.id}</Typography> },
    { id:'title', label:'Title', minWidth:220, render:r=> <Box><Typography variant="body2" fontWeight={600} noWrap sx={{maxWidth:240}}>{r.title}</Typography><Typography variant="caption" color="text.secondary">{r.taskType} • Parent {r.parentTaskId}</Typography></Box> },
    { id:'assignToName', label:'Assignee' },
    { id:'status', label:'Status', render:r=> <StatusChip status={r.status} /> },
    { id:'linkedChildTaskId', label:'Linked', render:r=> r.linkedChildTaskId || '—' },
    { id:'endDate', label:'Due', render:r=> (r as any).endDate ? fmtDate((r as any).endDate) : '—' },
  ];

  return (
    <Box>
      <Paper sx={{ p:2, mb:2 }}>
        <Stack direction={{ xs:'column', md:'row' }} spacing={1.5} alignItems={{ md:'center' }}>
          <TextField size="small" placeholder="Search child tasks" value={q} onChange={e=>{setQ(e.target.value); setPage(1);}} sx={{ flex:1, minWidth:240 }} />
          <TextField select size="small" label="Status" value={status} onChange={e=>{setStatus(e.target.value); setPage(1);}} sx={{ minWidth:160 }}><MenuItem value="">All</MenuItem>{['New','In Progress','Blocked','Completed','On Hold'].map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField>
          <Button variant="outlined" onClick={()=>{setQ(''); setStatus(''); setPage(1);}}>Clear</Button>
        </Stack>
      </Paper>
      {error ? <Paper sx={{ p:3, textAlign:'center' }}><Typography color="error">{error}</Typography><Button onClick={fetch}>Retry</Button></Paper> :
        <DataTable columns={columns} rows={rows} total={total} page={page} pageSize={pageSize} onPageChange={setPage} onRowsPerPageChange={setPageSize} loading={loading} emptyText="No child tasks found." onRowClick={r=> navigate(`/tasks/child/${r.id}`)} />
      }
    </Box>
  );
}
