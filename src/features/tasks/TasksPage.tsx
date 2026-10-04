import { Box, Tabs, Tab, Paper, Button, Stack } from '@mui/material';
import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { ParentTaskList } from './ParentTaskList';
import { ChildTaskList } from './ChildTaskList';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function TasksPage() {
  const [tab,setTab]=useState(0);
  const navigate = useNavigate();
  const user = useAuthStore(s=>s.user)!;
  const canCreateParent = user.role==='Project Manager' || user.role==='Operations Manager';

  return (
    <Box>
      <PageHeader title="Task Management" subtitle="Parent and child tasks for Computerization of FSL. Click a row to view details, progress, budget and comments." breadcrumbs={[{label:'Home', to:'/'},{label:'Task Management'}]}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={()=>navigate('/tasks/child/new')}>New Child Task</Button>
            {canCreateParent && <Button variant="contained" onClick={()=>navigate('/tasks/parent/new')}>New Parent Task</Button>}
          </Stack>
        }
      />
      <Paper sx={{ mb:2 }}>
        <Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="fullWidth">
          <Tab label="Parent Tasks" />
          <Tab label="Child Tasks" />
        </Tabs>
      </Paper>
      {tab===0 ? <ParentTaskList /> : <ChildTaskList />}
    </Box>
  );
}
