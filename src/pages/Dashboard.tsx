import { Box, Grid, Paper, Typography, Stack, LinearProgress, Chip } from '@mui/material';
import { PageHeader } from '../components/PageHeader';
import { mockApi } from '../api/mockApi';
import { useEffect, useState } from 'react';
import { ParentTask } from '../types';

export function Dashboard(){
  const [tasks,setTasks]=useState<ParentTask[]>([]);
  useEffect(()=>{ mockApi.listParents({ page:1, pageSize:100 }).then(r=> setTasks(r.data)); },[]);
  const total=tasks.length;
  const completed=tasks.filter(t=>t.status==='Completed').length;
  const inProg=tasks.filter(t=>t.status==='In Progress').length;
  const blocked=tasks.filter(t=>t.status==='Blocked').length;
  return (
    <Box>
      <PageHeader title="Dashboard" subtitle="Overview for Computerization of FSL" />
      <Grid container spacing={2}>
        {[
          { label:'Parent Tasks', value: total, color:'primary.main' },
          { label:'Completed', value: completed, color:'success.main' },
          { label:'In Progress', value: inProg, color:'info.main' },
          { label:'Blocked', value: blocked, color:'error.main' },
        ].map(c=> (
          <Grid key={c.label} item xs={12} sm={6} md={3}>
            <Paper sx={{ p:2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{c.label.toUpperCase()}</Typography>
              <Typography variant="h4" fontWeight={800} color={c.color}>{c.value}</Typography>
            </Paper>
          </Grid>
        ))}
        <Grid item xs={12}>
          <Paper sx={{ p:2 }}>
            <Typography fontWeight={700} mb={2}>Tasks by status</Typography>
            <Stack spacing={1.5}>
              {tasks.slice(0,5).map(t=> (
                <Box key={t.id}><Stack direction="row" justifyContent="space-between"><Typography variant="body2" fontWeight={600}>{t.id} — {t.title}</Typography><Chip label={t.status} size="small" /></Stack><LinearProgress variant="determinate" value={t.progress} sx={{ mt:0.5, height:6, borderRadius:1 }} /></Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}



