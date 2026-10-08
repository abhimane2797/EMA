import { useEffect, useState } from 'react';
import { Box, Paper, Typography, TextField, Grid, Button, MenuItem, Alert, Snackbar, Stack } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchableSelect } from '../../components/SearchableSelect';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../api';
import { useNavigate } from 'react-router-dom';
import { useUnsavedWarning } from '../../hooks/useUnsavedWarning';
import { PageHeader } from '../../components/PageHeader';

const schema = z.object({
  title: z.string().min(3,'Title required (min 3 chars)'),
  description: z.string().min(10,'Description required (min 10 chars)'),
  assetCategory: z.string().min(1,'Required'),
  assetClass: z.string().min(1,'Required'),
  assetSubType: z.string().optional(),
  location: z.string().min(1,'Required'),
  startDate: z.string().min(1,'Required'),
  endDate: z.string().min(1,'Required'),
  dueDate: z.string().min(1,'Required'),
  severity: z.string().min(1,'Required'),
  priority: z.string().min(1,'Required'),
  purpose: z.string().min(1,'Required'),
  assignedTo: z.string().optional(),
  status: z.string().default('New'),
}).refine(v=> v.startDate <= v.endDate, { message:'Start must be ≤ End', path:['endDate'] })
 .refine(v=> v.endDate <= v.dueDate, { message:'End must be ≤ Due', path:['dueDate'] });

type Values = z.infer<typeof schema>;

const FALLBACK = {
  assetCategories: [] as string[], assetClasses: [] as string[], assetSubTypes: [] as string[],
  locations: [] as string[], purposes: [] as string[],
  severities: ['Low','Medium','High','Critical'], priorities: ['Low','Medium','High','Critical'],
};

export function ParentTaskCreate() {
  const user = useAuthStore(s=>s.user)!;
  const navigate = useNavigate();
  const isPM = user.role==='Project Manager' || user.role==='Operations Manager';
  const [toast, setToast] = useState<string|null>(null);
  const [meta, setMeta] = useState(FALLBACK);
  const [users, setUsers] = useState<{label:string,value:string}[]>([]);

  const { register, handleSubmit, control, formState:{ errors, isDirty, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title:'', description:'', assetCategory:'', assetClass:'', assetSubType:'', location:'', startDate:'', endDate:'', dueDate:'', severity:'Medium', priority:'High', purpose:'', assignedTo:'', status:'New' }
  });

  useUnsavedWarning(isDirty);

  // Dropdown options + assignable users come from the backend (GET /tasks/meta, GET /users).
  useEffect(()=>{
    api.getTaskMeta()
      .then(m=> setMeta({ ...FALLBACK, ...m }))
      .catch(()=> setMeta(FALLBACK));
    api.listUsers()
      .then(list=> setUsers(list.filter(u=>u.status==='Active').map(u=>({ label:`${u.employeeName} (${u.designation})`, value:u.id }))))
      .catch(()=> setUsers([]));
  }, []);

  if (!isPM) {
    return <Box p={3}><Alert severity="error">Only Project Managers can create parent tasks.</Alert></Box>;
  }

  const onSubmit = async (vals: Values) => {
    const rec = await api.createParent({ ...vals, ownerId: vals.assignedTo || user.id } as any);
    setToast(`Parent task created — ${rec.id}`);
    setTimeout(()=> navigate(`/tasks/parent/${rec.id}`), 900);
  };

  return (
    <Box>
      <PageHeader title="Parent Task Creation" subtitle="Create a new parent task. All fields marked * are mandatory." breadcrumbs={[{label:'Task Management', to:'/tasks'},{label:'New Parent Task'}]} />
      <Paper sx={{ p:3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Title *" {...register('title')} error={!!errors.title} helperText={errors.title?.message} size="small" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description *" multiline minRows={4} {...register('description')} error={!!errors.description} helperText={errors.description?.message} /></Grid>

            <Grid item xs={12} md={4}>
              <Controller name="assetCategory" control={control} render={({field})=> (
                <SearchableSelect label="Asset Category" required options={meta.assetCategories.map(c=>({label:c,value:c}))} value={field.value||null} onChange={v=>field.onChange(v??'')} error={!!errors.assetCategory} helperText={errors.assetCategory?.message} />
              )} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller name="assetClass" control={control} render={({field})=> (
                <SearchableSelect label="Asset Class" required options={meta.assetClasses.map(c=>({label:c,value:c}))} value={field.value||null} onChange={v=>field.onChange(v??'')} error={!!errors.assetClass} helperText={errors.assetClass?.message} />
              )} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller name="assetSubType" control={control} render={({field})=> (
                <SearchableSelect label="Asset Sub Type" options={meta.assetSubTypes.map(c=>({label:c,value:c}))} value={field.value||null} onChange={v=>field.onChange(v??'')} placeholder={meta.assetSubTypes.length? 'Select' : 'N/A'} />
              )} />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller name="location" control={control} render={({field})=> (
                <SearchableSelect label="Location" required options={meta.locations.map(l=>({label:l,value:l}))} value={field.value||null} onChange={v=>field.onChange(v??'')} error={!!errors.location} helperText={errors.location?.message} />
              )} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller name="assignedTo" control={control} render={({field})=> (
                <SearchableSelect label="Assign To" options={users} value={field.value||null} onChange={v=>field.onChange(v??'')} placeholder="Defaults to you" helperText="Technical members only see parent tasks assigned to them" />
              )} />
            </Grid>
            <Grid item xs={12} md={4}><TextField fullWidth type="date" label="Start Date *" InputLabelProps={{ shrink:true }} {...register('startDate')} error={!!errors.startDate} helperText={errors.startDate?.message} size="small" /></Grid>

            <Grid item xs={12} md={3}><TextField fullWidth type="date" label="End Date *" InputLabelProps={{ shrink:true }} {...register('endDate')} error={!!errors.endDate} helperText={errors.endDate?.message} size="small" /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth type="date" label="Due Date *" InputLabelProps={{ shrink:true }} {...register('dueDate')} error={!!errors.dueDate} helperText={errors.dueDate?.message} size="small" /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth select label="Severity" {...register('severity')} error={!!errors.severity} size="small">{meta.severities.map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth select label="Priority" {...register('priority')} error={!!errors.priority} size="small">{meta.priorities.map(p=> <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Grid>

            <Grid item xs={12} md={3}><TextField fullWidth select label="Purpose" {...register('purpose')} error={!!errors.purpose} helperText={errors.purpose?.message} size="small">{meta.purposes.map(p=> <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth select label="Status" {...register('status')} size="small" disabled><MenuItem value="New">New</MenuItem></TextField></Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ fontSize:13 }}>Date rule: Start ≤ End ≤ Due. The backend auto-generates the task ID (e.g. PT-000001) on save.</Alert>
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button variant="outlined" onClick={()=> navigate('/tasks')}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>{isSubmitting?'Saving…':'Create Parent Task'}</Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={()=>setToast(null)} message={toast||''} anchorOrigin={{ vertical:'bottom', horizontal:'center' }} />
    </Box>
  );
}
