import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Autocomplete, Box, Button, Chip, Divider, FormControl, FormHelperText, Grid, InputLabel, MenuItem,
  Paper, Stack, TextField,
} from '@mui/material';
import { Save, Close, ClearAll } from '@mui/icons-material';
import { Ticket } from '../types';
import { TICKET_PRIORITIES, TICKET_SEVERITIES, TICKET_TYPES } from '../constants';
import { useTicketProjects, useSprints, useTicketSettings, useTicketUsers } from '../api/queries';
import { useTicketPermissions } from '../permissions';
import { MarkdownEditor } from './Markdown';
import { SearchableSelect } from '../../../components/SearchableSelect';

const schema = z.object({
  title: z.string().min(8, 'Summary must be at least 8 characters').max(200, 'Max 200 characters'),
  description: z.string().min(1, 'Description is required'),
  type: z.string().min(1, 'Type is required'),
  priority: z.string().min(1, 'Priority is required'),
  severity: z.string().min(1, 'Severity is required'),
  reporterId: z.string().min(1, 'Reporter is required'),
  assigneeId: z.string().optional(),
  projectId: z.string().min(1, 'Project is required'),
  sprintId: z.string().optional(),
  labels: z.array(z.string()),
  components: z.array(z.string()),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  storyPoints: z.string().optional(),
  originalEstimate: z.string().optional(),
  linkedTaskId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const num = (v?: string) => (v && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);

export function TicketForm({
  ticket, onSubmit, onCancel, saving,
}: {
  ticket?: Ticket;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}) {
  const perms = useTicketPermissions();
  const usersQ = useTicketUsers();
  const projectsQ = useTicketProjects();
  const sprintsQ = useSprints();
  const settingsQ = useTicketSettings();

  const users = (usersQ.data || []).map(u => ({ id: u.id, name: u.employeeName, role: u.role, status: u.status }));
  const settings = settingsQ.data;
  const editableCore = !ticket || perms.canEditCore;

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: ticket
      ? {
          title: ticket.title,
          description: ticket.description,
          type: ticket.type,
          priority: ticket.priority,
          severity: ticket.severity,
          reporterId: ticket.reporterId,
          assigneeId: ticket.assigneeId || '',
          projectId: ticket.projectId,
          sprintId: ticket.sprintId || '',
          labels: ticket.labels,
          components: ticket.components,
          dueDate: ticket.dueDate || '',
          startDate: ticket.startDate || '',
          storyPoints: ticket.storyPoints == null ? '' : String(ticket.storyPoints),
          originalEstimate: ticket.originalEstimate == null ? '' : String(ticket.originalEstimate),
          linkedTaskId: ticket.linkedTaskId || '',
        }
      : {
          title: '', description: '', type: 'Task', priority: 'Medium', severity: 'Major',
          reporterId: perms.user?.id || '', assigneeId: '', projectId: 'proj-1', sprintId: '',
          labels: [], components: [], dueDate: '', startDate: '', storyPoints: '', originalEstimate: '', linkedTaskId: '',
        },
  });

  const submit = handleSubmit(async values => { await onSubmit(values); });

  const resetAll = () => reset({
    title: '', description: '', type: 'Task', priority: 'Medium', severity: 'Major',
    reporterId: perms.user?.id || '', assigneeId: '', projectId: 'proj-1', sprintId: '',
    labels: [], components: [], dueDate: '', startDate: '', storyPoints: '', originalEstimate: '', linkedTaskId: '',
  });

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }}>
      <form onSubmit={submit} noValidate>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Summary"
                  required
                  autoFocus={!ticket}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  placeholder="Short, actionable summary of the work"
                  inputProps={{ 'aria-label': 'Summary' }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Box>
                  <MarkdownEditor
                    value={field.value}
                    onChange={field.onChange}
                    minRows={6}
                    label="Description"
                    required
                  />
                  <FormHelperText error={!!errors.description}>{errors.description?.message}</FormHelperText>
                </Box>
              )}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <TextField {...field} select fullWidth label="Type" required error={!!errors.type} helperText={errors.type?.message}>
                  {TICKET_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <TextField {...field} select fullWidth label="Priority" required disabled={!editableCore}
                  error={!!errors.priority} helperText={errors.priority?.message || (editableCore ? '' : 'Only PM / OM can change priority')}>
                  {TICKET_PRIORITIES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Controller
              name="severity"
              control={control}
              render={({ field }) => (
                <TextField {...field} select fullWidth label="Severity" required error={!!errors.severity} helperText={errors.severity?.message}>
                  {TICKET_SEVERITIES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Controller
              name="storyPoints"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth label="Story points" type="number" inputProps={{ min: 0, max: 100, 'aria-label': 'Story points' }}
                  error={!!errors.storyPoints} helperText={errors.storyPoints?.message || ' '} />
              )}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Controller
              name="reporterId"
              control={control}
              render={({ field }) => (
                <TextField {...field} select fullWidth label="Reporter" required disabled={!editableCore}
                  error={!!errors.reporterId} helperText={errors.reporterId?.message || (editableCore ? ' ' : 'Reporter cannot be changed')}>
                  {users.filter(u => u.status === 'Active').map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Assign to"
                  options={[{ label: 'Unassigned', value: '' }, ...users.filter(u => u.status === 'Active').map(u => ({ label: `${u.name} (${u.role})`, value: u.id }))]}
                  value={field.value || ''}
                  onChange={v => field.onChange(v || '')}
                  error={!!errors.assigneeId}
                  helperText={errors.assigneeId?.message || ' '}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Controller
              name="sprintId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Sprint"
                  options={[
                    { label: 'Backlog (no sprint)', value: '' },
                    ...(sprintsQ.data || []).filter(s => s.status !== 'completed').map(s => ({ label: `${s.name} (${s.status})`, value: s.id })),
                  ]}
                  value={field.value || ''}
                  onChange={v => field.onChange(v || '')}
                  helperText=" "
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="labels"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  options={settings?.labels || []}
                  value={field.value}
                  onChange={(_e, v) => field.onChange(v)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip variant="outlined" size="small" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
                    ))
                  }
                  renderInput={params => (
                    <TextField {...params} label="Labels" error={!!errors.labels} helperText={errors.labels?.message || ' '} />
                  )}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Controller
              name="components"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  options={settings?.components || []}
                  value={field.value}
                  onChange={(_e, v) => field.onChange(v)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip variant="outlined" size="small" label={option} {...getTagProps({ index })} key={`${option}-${index}`} />
                    ))
                  }
                  renderInput={params => (
                    <TextField {...params} label="Components" error={!!errors.components} helperText={errors.components?.message || ' '} />
                  )}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={3}>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth type="date" label="Start date" InputLabelProps={{ shrink: true }}
                  error={!!errors.startDate} helperText={errors.startDate?.message || ' '} />
              )}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth type="date" label="Due date" InputLabelProps={{ shrink: true }}
                  error={!!errors.dueDate} helperText={errors.dueDate?.message || ' '} />
              )}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Controller
              name="originalEstimate"
              control={control}
              render={({ field }) => (
                <TextField {...field} fullWidth label="Estimate (hours)" type="number" inputProps={{ min: 0, 'aria-label': 'Estimate in hours' }}
                  error={!!errors.originalEstimate} helperText={errors.originalEstimate?.message || ' '} />
              )}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.projectId}>
                  <InputLabel id="ticket-project-label">Project</InputLabel>
                  <TextField {...field} select label="Project" SelectProps={{ labelId: 'ticket-project-label' }}
                    helperText={errors.projectId?.message || ' '}>
                    {(projectsQ.data || []).filter(p => p.active).map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    {!projectsQ.data?.length && <MenuItem value="proj-1">Computerization of FSL</MenuItem>}
                  </TextField>
                </FormControl>
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ mb: 1 }} />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              {ticket ? (
                <Button variant="outlined" startIcon={<Close />} onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
              ) : (
                <Button variant="outlined" startIcon={<ClearAll />} onClick={resetAll} disabled={isSubmitting}>Reset</Button>
              )}
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={isSubmitting || saving}
                data-testid="ticket-submit"
              >
                {isSubmitting || saving ? 'Saving…' : ticket ? 'Save changes' : 'Create ticket'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}

export type { FormValues as TicketFormValues };
export const toNumber = num;
