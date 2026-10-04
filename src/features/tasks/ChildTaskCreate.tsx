import { useEffect, useState } from 'react';
import { Box, Paper, Typography, TextField, Grid, Button, MenuItem, Alert, Snackbar, Stack } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchableSelect } from '../../components/SearchableSelect';
import { FileUploader } from '../../components/FileUploader';
import { mockApi } from '../../api/mockApi';
import { useAuthStore } from '../../store/authStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Attachment } from '../../types';

const schema = z.object({
  title: z.string().min(3,'Title required'),
  taskType: z.string().min(1,'Task type required'),
  parentTaskId: z.string().min(1,'Parent Task required'),
  linkedChildTaskId: z.string().optional().nullable(),
  assignToId: z.string().min(1,'Assignee required'),
  status: z.string().default('New'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function ChildTaskCreate() {
  const user = useAuthStore(s=>s.user)!;
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const preselectedParent = search.get('parent') || '';
  const [parents, setParents] = useState<{label:string,value:string}[]>([]);
  const [childrenOpts, setChildrenOpts] = useState<{label:string,value:string}[]>([]);
  const [users, setUsers] = useState<{label:string,value:string}[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [toast, setToast] = useState<string|null>(null);

  const { register, handleSubmit, control, watch, formState:{ errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues:{ title:'', taskType:'', parentTaskId: preselectedParent, linkedChildTaskId:'', assignToId:'', status:'New', startDate:'', endDate:'' }
  });

  const parentWatch = watch('parentTaskId');

  useEffect(()=>{
    mockApi.listParents({ page:1, pageSize:100 }).then(r=> setParents(r.data.map(p=>({label:`${p.id} — ${p.title}`, value:p.id}))));
    mockApi.listUsers().then(us=> setUsers(us.filter(u=>u.status==='Active').map(u=>({label:`${u.employeeName} (${u.designation})`, value:u.id}))));
  }, []);
  useEffect(()=>{
    mockApi.listChildren({ page:1, pageSize:100 }).then(r=> setChildrenOpts(r.data.map(c=>({label:`${c.id} — ${c.title}`, value:c.id}))));
  }, []);

  const onSubmit = async (vals: Values) => {
    // create child
    const rec:any = await mockApi.createChild({
      title: vals.title, taskType: vals.taskType, parentTaskId: vals.parentTaskId, linkedChildTaskId: vals.linkedChildTaskId||null,
      assignToId: vals.assignToId, assignToName:'', status: vals.status as any, startDate: vals.startDate, endDate: vals.endDate
    } as any);
    // upload files sequentially
    for (const f of files) {
      const att:any = await mockApi.addAttachment(rec.id, f);
      setAttachments(prev=> [...prev, att]);
    }
    setToast(`Child task created — ${rec.id}`);
    setTimeout(()=> navigate(`/tasks/child/${rec.id}`), 900);
  };

  return (
    <Box>
      <PageHeader title="Child Task Creation" subtitle="All members can create child tasks. Parent Task is mandatory and searchable." breadcrumbs={[{label:'Task Management', to:'/tasks'},{label:'New Child Task'}]} />
      <Paper sx={{ p:3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Title *" {...register('title')} error={!!errors.title} helperText={errors.title?.message} size="small" /></Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth select label="Task Type *" {...register('taskType')} error={!!errors.taskType} helperText={errors.taskType?.message} size="small">
                {['Implementation','Procurement','Testing','Audit','Documentation','Support','Design'].map(t=> <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller name="parentTaskId" control={control} render={({field})=> (
                <SearchableSelect label="Parent Task ID" required options={parents} value={field.value} onChange={field.onChange} error={!!errors.parentTaskId} helperText={errors.parentTaskId?.message} placeholder="Search parent tasks" />
              )} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller name="linkedChildTaskId" control={control} render={({field})=> (
                <SearchableSelect label="Linked Child Task (optional)" options={childrenOpts} value={field.value||null} onChange={field.onChange} placeholder="Optional" />
              )} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller name="assignToId" control={control} render={({field})=> (
                <SearchableSelect label="Assign To" required options={users} value={field.value} onChange={field.onChange} error={!!errors.assignToId} helperText={errors.assignToId?.message} />
              )} />
            </Grid>
            <Grid item xs={12} md={3}><TextField fullWidth select label="Status" {...register('status')} size="small"><MenuItem value="New">New</MenuItem><MenuItem value="In Progress">In Progress</MenuItem><MenuItem value="Blocked">Blocked</MenuItem><MenuItem value="Completed">Completed</MenuItem></TextField></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Start Date" InputLabelProps={{shrink:true}} {...register('startDate')} size="small" /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Due / End Date" InputLabelProps={{shrink:true}} {...register('endDate')} size="small" /></Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Attachments (drag & drop)</Typography>
              <FileUploader attachments={attachments as any} onAdd={(fs)=> setFiles(prev=>[...prev, ...fs])} onRemove={(id)=> setFiles(prev=> prev.filter((_,i)=> i.toString()!==id))} onDownload={()=>{}} />
              {!!files.length && <Stack spacing={0.5} mt={1}>{files.map((f,i)=> <Typography key={i} variant="caption">{f.name} • {(f.size/1024).toFixed(1)} KB — pending upload on save</Typography>)}</Stack>}
              <Typography variant="caption" color="text.secondary">Allowed: pdf, xlsx, docx, png, jpg • Max 5 MB — attachments are downloadable after creation.</Typography>
            </Grid>

            <Grid item xs={12}><Stack direction="row" justifyContent="flex-end" spacing={1}><Button variant="outlined" onClick={()=>navigate('/tasks')}>Cancel</Button><Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting?'Saving…':'Create Child Task'}</Button></Stack></Grid>
          </Grid>
        </Box>
      </Paper>
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={()=>setToast(null)} message={toast||''} />
    </Box>
  );
}
