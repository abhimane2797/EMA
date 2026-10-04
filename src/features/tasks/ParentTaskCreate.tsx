import { useMemo, useState } from 'react';
import { Box, Paper, Typography, TextField, Grid, Button, MenuItem, Alert, Snackbar, Stack, Divider } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchableSelect } from '../../components/SearchableSelect';
import { assetOptions, locations } from '../../mocks/data';
import { useAuthStore } from '../../store/authStore';
import { mockApi } from '../../api/mockApi';
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
  severity: z.enum(['Low','Medium','High','Critical']),
  priority: z.enum(['P1','P2','P3','P4']),
  purpose: z.enum(['Implementation','Maintenance','Audit','Training','Upgrade','Support']),
  status: z.string().default('New'),
}).refine(v=> v.startDate <= v.endDate, { message:'Start must be ≤ End', path:['endDate'] })
 .refine(v=> v.endDate <= v.dueDate, { message:'End must be ≤ Due', path:['dueDate'] });

type Values = z.infer<typeof schema>;

export function ParentTaskCreate() {
  const user = useAuthStore(s=>s.user)!;
  const navigate = useNavigate();
  const isPM = user.role==='Project Manager' || user.role==='Operations Manager';
  const [toast, setToast] = useState<string|null>(null);

  const { register, handleSubmit, control, watch, formState:{ errors, isDirty, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title:'', description:'', assetCategory:'', assetClass:'', assetSubType:'', location:'', startDate:'', endDate:'', dueDate:'', severity:'Medium', priority:'P2', purpose:'Implementation', status:'New' }
  });

  useUnsavedWarning(isDirty);

  const cat = watch('assetCategory');
  const cls = watch('assetClass');
  const classes = useMemo(()=> cat ? (assetOptions.classes[cat]||[]) : [], [cat]);
  const subTypes = useMemo(()=> cls ? (assetOptions.subTypes[cls]||[]) : [], [cls]);

  if (!isPM) {
    return <Box p={3}><Alert severity="error">Only Project Managers can create parent tasks.</Alert></Box>;
  }

  const onSubmit = async (vals: Values) => {
    const rec = await mockApi.createParent({ ...vals, assetSubType: vals.assetSubType||'', ownerId: user.id } as any);
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
                <SearchableSelect label="Asset Category" required options={assetOptions.categories.map(c=>({label:c,value:c}))} value={field.value} onChange={field.onChange} error={!!errors.assetCategory} helperText={errors.assetCategory?.message} />
              )} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller name="assetClass" control={control} render={({field})=> (
                <SearchableSelect label="Asset Class" required options={classes.map(c=>({label:c,value:c}))} value={field.value} onChange={field.onChange} error={!!errors.assetClass} helperText={errors.assetClass?.message} />
              )} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Controller name="assetSubType" control={control} render={({field})=> (
                <SearchableSelect label="Asset Sub Type" options={subTypes.map(c=>({label:c,value:c}))} value={field.value||null} onChange={field.onChange} placeholder={subTypes.length? 'Select' : 'N/A'} />
              )} />
            </Grid>

            <Grid item xs={12} md={4}>
              <Controller name="location" control={control} render={({field})=> (
                <SearchableSelect label="Location" required options={locations.map(l=>({label:l,value:l}))} value={field.value} onChange={field.onChange} error={!!errors.location} helperText={errors.location?.message} />
              )} />
            </Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Start Date *" InputLabelProps={{ shrink:true }} {...register('startDate')} error={!!errors.startDate} helperText={errors.startDate?.message} size="small" /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="End Date *" InputLabelProps={{ shrink:true }} {...register('endDate')} error={!!errors.endDate} helperText={errors.endDate?.message} size="small" /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Due Date *" InputLabelProps={{ shrink:true }} {...register('dueDate')} error={!!errors.dueDate} helperText={errors.dueDate?.message} size="small" /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth select label="Severity" {...register('severity')} size="small">{['Low','Medium','High','Critical'].map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>

            <Grid item xs={12} md={3}><TextField fullWidth select label="Priority" {...register('priority')} size="small">{['P1','P2','P3','P4'].map(p=> <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth select label="Purpose" {...register('purpose')} size="small">{['Implementation','Maintenance','Audit','Training','Upgrade','Support'].map(p=> <MenuItem key={p} value={p}>{p}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth select label="Status" {...register('status')} size="small" disabled><MenuItem value="New">New</MenuItem></TextField></Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ fontSize:13 }}>Date rule: Start ≤ End ≤ Due. System will auto-generate Task ID (e.g., TSK-0007) on save.</Alert>
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
