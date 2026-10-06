import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Drawer, FormControlLabel, Grid, IconButton, List, ListItem, MenuItem, Paper, Stack, TextField,
  Tooltip, Typography,
} from '@mui/material';
import {
  Add, Close, Delete, Edit, FileCopy, Link as LinkIcon, OpenInNew, Remove, Visibility, VisibilityOff,
} from '@mui/icons-material';
import { PageHeader } from '../../../components/PageHeader';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { FileUploader } from '../../../components/FileUploader';
import { fmtDate, fmtDateTime, downloadBlob } from '../../../utils';
import { Ticket, TicketLinkType, TicketStatus, TicketAttachment } from '../types';
import { LINK_TYPES, PRIORITY_COLORS, STATUS_COLORS, formatDuration, initials } from '../constants';
import { Markdown } from '../components/Markdown';
import { TicketComments } from '../components/TicketComments';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { WorkLogPanel } from '../components/WorkLogPanel';
import { TicketForm, TicketFormValues, toNumber } from '../components/TicketForm';
import { PriorityIcon, TicketStatusChip } from '../components/TicketStatusChip';
import { TypeIcon } from '../components/TypeIcon';
import { LabelChips } from '../components/LabelChips';
import { StatusSelect } from '../components/StatusSelect';
import {
  useAddAttachment, useCloneTicket, useDeleteTicket, useLinkTicket, useRemoveAttachment,
  useSetSubtasks, useTicket, useTicketUsers, useUnlinkTicket, useUpdateTicket, useUpdateTicketStatus,
  useWatchTicket,
} from '../api/queries';
import { useTicketPermissions } from '../permissions';
import { useStatusMove } from '../hooks/useStatusMove';
import { toast } from '../store/toastStore';

export function TicketDetailPage() {
  const { key = '' } = useParams();
  const navigate = useNavigate();
  const perms = useTicketPermissions();
  const [searchParams] = useSearchParams();

  const bundleQ = useTicket(key);
  const usersQ = useTicketUsers();
  const update = useUpdateTicket();
  const del = useDeleteTicket();
  const clone = useCloneTicket();
  const watch = useWatchTicket();
  const setSubtasks = useSetSubtasks();
  const addAttachment = useAddAttachment();
  const removeAttachment = useRemoveAttachment();
  const linkTicket = useLinkTicket();
  const unlinkTicket = useUnlinkTicket();
  const statusMove = useStatusMove();
  const updateStatus = useUpdateTicketStatus();

  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState('');
  const [linkType, setLinkType] = useState<TicketLinkType>('relates to');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const movedOnce = useRef(false);

  const users = (usersQ.data || []).map(u => ({ id: u.id, name: u.employeeName }));
  const bundle = bundleQ.data;

  useEffect(() => {
    const s = searchParams.get('status');
    if (s && bundle && !movedOnce.current && perms.canChangeStatus(bundle.ticket)) {
      movedOnce.current = true;
      statusMove.move(key, s as TicketStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, bundle]);

  const patchFromForm = (v: TicketFormValues, t: Ticket): any => {
    const patch: any = {};
    if (v.title !== t.title) patch.title = v.title;
    if (v.description !== t.description) patch.description = v.description;
    if (v.type !== t.type) patch.type = v.type;
    if (v.priority !== t.priority && perms.canEditCore) patch.priority = v.priority;
    if (v.severity !== t.severity) patch.severity = v.severity;
    if (v.reporterId !== t.reporterId && perms.canEditCore) patch.reporterId = v.reporterId;
    if ((v.assigneeId || null) !== t.assigneeId) patch.assigneeId = v.assigneeId || null;
    if ((v.sprintId || null) !== t.sprintId) patch.sprintId = v.sprintId || null;
    if (JSON.stringify(v.labels) !== JSON.stringify(t.labels)) patch.labels = v.labels;
    if (JSON.stringify(v.components) !== JSON.stringify(t.components)) patch.components = v.components;
    if ((v.dueDate || null) !== t.dueDate) patch.dueDate = v.dueDate || null;
    if ((v.startDate || null) !== t.startDate) patch.startDate = v.startDate || null;
    if (toNumber(v.storyPoints) !== t.storyPoints) patch.storyPoints = toNumber(v.storyPoints);
    if (toNumber(v.originalEstimate) !== t.originalEstimate) patch.originalEstimate = toNumber(v.originalEstimate);
    if ((v.linkedTaskId || null) !== t.linkedTaskId) patch.linkedTaskId = v.linkedTaskId || null;
    return patch;
  };

  if (bundleQ.isLoading) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography color="text.secondary">Loading {key}…</Typography>
      </Paper>
    );
  }

  if (!bundle) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <Typography variant="h6">Ticket {key} not found</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>It may have been deleted, or you do not have access.</Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/tickets/list')}>Back to list</Button>
      </Paper>
    );
  }

  const t = bundle.ticket;
  const canEdit = perms.canEdit(t);
  const watched = !!perms.user && t.watchers.includes(perms.user.id);

  const toggleSubtask = (id: string) => {
    const next = t.subtasks.map(s => (s.id === id ? { ...s, done: !s.done } : s));
    setSubtasks.mutate({ key: t.key, subtasks: next });
  };

  const addSubtask = (title: string) => {
    setSubtasks.mutate({ key: t.key, subtasks: [...t.subtasks, { id: Math.random().toString(36).slice(2, 8), title, done: false }] });
  };

  const detailRows: { label: string; value: React.ReactNode }[] = [
    { label: 'Assignee', value: t.assigneeName
      ? <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={t.assigneeName}><Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'primary.light', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{initials(t.assigneeName)}</Box></Tooltip>
          <Typography variant="body2">{t.assigneeName}</Typography>
        </Stack>
      : <Chip size="small" variant="outlined" label="Unassigned" /> },
    { label: 'Reporter', value: <Typography variant="body2">{t.reporterName}</Typography> },
    { label: 'Project', value: <Typography variant="body2">{t.projectName}</Typography> },
    { label: 'Sprint', value: t.sprintId
      ? <Chip size="small" color="primary" variant="outlined" label={t.sprintId} />
      : <Chip size="small" label="Backlog" /> },
    { label: 'Labels', value: <LabelChips labels={t.labels} max={6} /> },
    { label: 'Components', value: t.components.length
      ? <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>{t.components.map(c => <Chip key={c} size="small" label={c} />)}</Stack>
      : <Typography variant="body2" color="text.secondary">—</Typography> },
    { label: 'Start date', value: <Typography variant="body2">{t.startDate ? fmtDate(t.startDate) : '—'}</Typography> },
    { label: 'Due date', value: <Typography variant="body2" color={t.dueDate && t.status !== 'Done' && new Date(t.dueDate) < new Date() ? 'error.main' : 'text.primary'}>
      {t.dueDate ? fmtDate(t.dueDate) : '—'}
    </Typography> },
    { label: 'Estimate', value: <Typography variant="body2">{t.originalEstimate != null ? `${formatDuration(t.originalEstimate)} (${t.originalEstimate}h)` : '—'}</Typography> },
    { label: 'Time spent', value: <Typography variant="body2">{formatDuration(t.timeSpent)}</Typography> },
    { label: 'Story points', value: <Typography variant="body2">{t.storyPoints ?? '—'}</Typography> },
    { label: 'Resolution', value: t.resolution ? <Chip size="small" color={t.status === 'Done' ? 'success' : 'default'} label={t.resolution} /> : <Typography variant="body2" color="text.secondary">—</Typography> },
    { label: 'Watchers', value: <Typography variant="body2">{t.watchers.length}</Typography> },
    { label: 'Created', value: <Typography variant="body2">{fmtDateTime(t.createdAt)}</Typography> },
    { label: 'Updated', value: <Typography variant="body2">{fmtDateTime(t.updatedAt)}</Typography> },
  ];

  return (
    <>
      <PageHeader
        title={`${t.key} · ${t.title}`}
        subtitle={`${t.type} · ${t.severity} severity · reported by ${t.reporterName} on ${fmtDate(t.createdAt)}`}
        icon={<TypeIcon type={t.type} size={24} />}
        breadcrumbs={[{ label: 'Tickets', to: '/tickets' }, { label: 'List', to: '/tickets/list' }, { label: t.key }]}
        action={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <StatusSelect
              value={t.status}
              disabled={!perms.canChangeStatus(t)}
              ticketKey={t.key}
              onChange={(status, resolution) => updateStatus.mutate({ key: t.key, status, resolution: resolution ?? null })}
            />
            <PriorityIcon priority={t.priority} size={18} />
            <Divider orientation="vertical" flexItem />
            <Tooltip title={watched ? 'Stop watching' : 'Watch this ticket'}>
              <IconButton onClick={() => perms.user && watch.mutate({ key: t.key, userId: perms.user.id, watch: !watched })} aria-label="Toggle watch">
                {watched ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Clone this ticket">
              <IconButton onClick={() => clone.mutate(t.key, { onSuccess: c => navigate(`/tickets/${c.key}`) })} aria-label="Clone ticket">
                <FileCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" variant="outlined" startIcon={<Edit />} disabled={!canEdit} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            {perms.canDelete && (
              <Button size="small" color="error" variant="outlined" startIcon={<Delete />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </Stack>
        }
      />

      {t.status === 'Blocked' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This ticket is <b>Blocked</b>. Allowed next steps: Backlog, To Do, In Progress.
        </Alert>
      )}
      {t.status === 'Done' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Closed as <b>{t.resolution || 'Done'}</b> on {t.resolvedAt ? fmtDate(t.resolvedAt) : '—'}. Only Reopened reopens it.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Description</Typography>
            <Markdown>{t.description}</Markdown>
          </Paper>

          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography variant="subtitle2" color="text.secondary">Subtasks</Typography>
              <Chip size="small" label={`${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}`} />
              <Box flex={1} />
              {canEdit && <AddSubtaskButton onAdd={addSubtask} />}
            </Stack>
            {t.subtasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No subtasks.</Typography>
            ) : (
              <List dense disablePadding>
                {t.subtasks.map(s => (
                  <ListItem key={s.id} disableGutters>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={s.done} disabled={!canEdit} onChange={() => toggleSubtask(s.id)} inputProps={{ 'aria-label': s.title }} />}
                      label={<Typography variant="body2" sx={{ textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'text.secondary' : 'text.primary' }}>{s.title}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <LinkIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" color="text.secondary">Linked tickets</Typography>
              <Box flex={1} />
              {canEdit && <Button size="small" startIcon={<Add />} onClick={() => setLinkOpen(true)}>Link</Button>}
            </Stack>
            {t.links.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No links.</Typography>
            ) : (
              <Stack spacing={0.75}>
                {t.links.map(l => (
                  <Stack key={l.id} direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={l.type} sx={{ minWidth: 96, justifyContent: 'center' }} />
                    <Button size="small" onClick={() => navigate(`/tickets/${l.ticketKey}`)} sx={{ textTransform: 'none', fontFamily: 'monospace' }}>
                      {l.ticketKey} <OpenInNew sx={{ fontSize: 13, ml: 0.5 }} />
                    </Button>
                    {canEdit && (
                      <IconButton size="small" aria-label={`Unlink ${l.ticketKey}`} onClick={() => unlinkTicket.mutate({ key: t.key, linkId: l.id })}>
                        <Close sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>Attachments</Typography>
            <FileUploader
              attachments={t.attachments}
              onAdd={files => files.forEach(f => addAttachment.mutate({
                key: t.key,
                attachment: {
                  id: Math.random().toString(36).slice(2, 9),
                  name: f.name,
                  size: f.size,
                  type: f.type || 'application/octet-stream',
                  url: URL.createObjectURL(f),
                  uploadedAt: new Date().toISOString(),
                  uploadedBy: perms.user?.employeeName || 'Unknown',
                } as TicketAttachment,
              }))}
              onRemove={id => removeAttachment.mutate({ key: t.key, attachmentId: id })}
              onDownload={a => fetch(a.url).then(r => r.blob()).then(b => downloadBlob(b, a.name)).catch(() => toast('Download unavailable for this attachment', 'warning'))}
            />
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
              Discussion · {bundle.comments.length} comment{bundle.comments.length === 1 ? '' : 's'}
            </Typography>
            <TicketComments ticketKey={t.key} comments={bundle.comments} users={users} canComment={perms.canComment} />
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>Details</Typography>
            <Grid container spacing={1.5}>
              {detailRows.map(r => (
                <Grid item xs={12} sm={6} key={r.label}>
                  <Typography variant="caption" color="text.secondary" display="block">{r.label}</Typography>
                  <Box sx={{ mt: 0.25, minHeight: 24 }}>{r.value}</Box>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_COLORS[t.priority] }} />
              <Typography variant="caption" color="text.secondary">
                {t.severity} severity · SLA clock based on priority · status colour {STATUS_COLORS[t.status]}
              </Typography>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>Time tracking</Typography>
            <WorkLogPanel ticket={t} workLogs={bundle.workLogs} />
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Activity</Typography>
            <ActivityTimeline entries={bundle.activity} />
          </Paper>
        </Grid>
      </Grid>

      <Drawer anchor="right" open={editOpen} onClose={() => setEditOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Edit fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>Edit {t.key}</Typography>
          <Box flex={1} />
          <IconButton onClick={() => setEditOpen(false)} aria-label="Close editor"><Close /></IconButton>
        </Stack>
        <Box sx={{ p: 2 }}>
          <TicketForm
            ticket={t}
            saving={update.isPending}
            onCancel={() => setEditOpen(false)}
            onSubmit={async v => {
              const patch = patchFromForm(v, t);
              if (!Object.keys(patch).length) { toast('No changes to save', 'info'); setEditOpen(false); return; }
              await update.mutateAsync({ key: t.key, patch });
              setEditOpen(false);
            }}
          />
        </Box>
      </Drawer>

      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Link {t.key} to another ticket</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              label="Relationship"
              value={linkType}
              onChange={e => setLinkType(e.target.value as TicketLinkType)}
            >
              {LINK_TYPES.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
            <TextField
              fullWidth
              label="Ticket key"
              placeholder="EMA-118"
              value={linkTarget}
              onChange={e => setLinkTarget(e.target.value.toUpperCase())}
              inputProps={{ 'aria-label': 'Ticket key' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!linkTarget || linkTarget === t.key}
            onClick={() => {
              linkTicket.mutate({ key: t.key, targetKey: linkTarget, type: linkType }, {
                onSuccess: () => { setLinkOpen(false); setLinkTarget(''); },
              });
            }}
          >
            Link
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${t.key}`}
        message="This permanently removes the ticket, its comments, activity and work logs."
        confirmText="Delete ticket"
        danger
        onConfirm={() => {
          setConfirmDelete(false);
          del.mutate(t.key, { onSuccess: () => navigate('/tickets/list') });
        }}
        onClose={() => setConfirmDelete(false)}
      />

      {statusMove.dialog}
    </>
  );
}

function AddSubtaskButton({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  return (
    <>
      <Button size="small" startIcon={<Add />} onClick={() => setOpen(true)}>Subtask</Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add subtask</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && title.trim()) { onAdd(title.trim()); setTitle(''); setOpen(false); } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!title.trim()} onClick={() => { onAdd(title.trim()); setTitle(''); setOpen(false); }}>Add</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
