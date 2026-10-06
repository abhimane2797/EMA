import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper,
  Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add, Close, Flag, PlayArrow, TaskAlt, ArrowDownward } from '@mui/icons-material';
import { Menu } from '@mui/material';
import {
  closestCorners, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useDroppable, useDraggable,
  useSensor, useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { PageHeader } from '../../../components/PageHeader';
import { fmtDate } from '../../../utils';
import { BacklogSnapshot, Sprint, Ticket, TicketStatus } from '../types';
import { STATUS_COLORS, formatDuration } from '../constants';
import { TicketCard } from '../components/TicketCard';
import { BurndownChart } from '../components/BurndownChart';
import { useBacklog, useBurndown, useCompleteSprint, useCreateSprint, useMoveTicket, useStartSprint } from '../api/queries';
import { useTicketPermissions } from '../permissions';
import { useTicketHotkeys } from '../hooks/useTicketHotkeys';
import { toast } from '../store/toastStore';

function DroppableList({ id, children, emptyText }: { id: string; children: React.ReactNode; emptyText: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex', flexDirection: 'column', gap: 1.25, minHeight: 90, p: 1.25, borderRadius: 2,
        bgcolor: isOver ? 'primary.50' : 'grey.50',
        border: '1px dashed', borderColor: isOver ? 'primary.main' : 'divider',
        transition: 'background-color 120ms ease',
      }}
    >
      {children}
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>{emptyText}</Typography>
    </Box>
  );
}

function BacklogTicketRow({ ticket, sprints, onOpen, onMoveSprint }: {
  ticket: Ticket;
  sprints: Sprint[];
  onOpen: (k: string) => void;
  onMoveSprint: (k: string, sprintId: string | null) => void;
}) {
  const drag = useDraggable({ id: `card:${ticket.key}`, data: { ticket } });
  const drop = useDroppable({ id: `card:${ticket.key}`, data: { ticket } });
  const setRefs = (node: HTMLDivElement | null) => { drag.setNodeRef(node); drop.setNodeRef(node); };

  return (
    <Box
      ref={setRefs}
      style={{ opacity: drag.isDragging ? 0.4 : 1 }}
      {...drag.listeners}
      {...drag.attributes}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <TicketCard
          ticket={ticket}
          onOpen={onOpen}
          showStatus
          showAssignee={false}
          sx={{ flex: 1 }}
        />
        <SprintMoveMenu ticket={ticket} sprints={sprints} onMove={onMoveSprint} />
      </Stack>
    </Box>
  );
}

function SprintMoveMenu({ ticket, sprints, onMove }: { ticket: Ticket; sprints: Sprint[]; onMove: (k: string, id: string | null) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title="Move to sprint">
        <IconButton size="small" aria-label={`Move ${ticket.key} to sprint`} onClick={e => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
          <Flag fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} onClick={e => e.stopPropagation()}>
        <MenuItem onClick={() => { setAnchor(null); onMove(ticket.key, null); }}>Backlog</MenuItem>
        {sprints.filter(s => s.status !== 'completed').map(s => (
          <MenuItem key={s.id} onClick={() => { setAnchor(null); onMove(ticket.key, s.id); }}>{s.name}</MenuItem>
        ))}
      </Menu>
    </>
  );
}


function SprintSection({ snapshot, sprint, tickets, onOpen, onMoveSprint, canManage }: {
  snapshot: BacklogSnapshot;
  sprint: Sprint;
  tickets: Ticket[];
  onOpen: (k: string) => void;
  onMoveSprint: (k: string, id: string | null) => void;
  canManage: boolean;
}) {
  const navigate = useNavigate();
  const start = useStartSprint();
  const complete = useCompleteSprint();
  const burndown = useBurndown(sprint.id, sprint.status !== 'planned');
  const [completeOpen, setCompleteOpen] = useState(false);
  const [destination, setDestination] = useState<string>('backlog');

  const done = tickets.filter(t => t.status === 'Done').length;
  const points = tickets.reduce((a, t) => a + (t.storyPoints || 0), 0);
  const donePoints = tickets.filter(t => t.status === 'Done').reduce((a, t) => a + (t.storyPoints || 0), 0);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={sprint.status.toUpperCase()}
          sx={{
            bgcolor: sprint.status === 'active' ? STATUS_COLORS['In Progress'] : sprint.status === 'completed' ? STATUS_COLORS.Done : STATUS_COLORS.Backlog,
            color: '#fff', fontWeight: 700,
          }}
        />
        <Typography variant="h6" fontWeight={700}>{sprint.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)} · {tickets.length} tickets · {done} done · {points} pts ({donePoints} burned)
        </Typography>
        <Box flex={1} />
        {canManage && sprint.status === 'planned' && (
          <Button size="small" variant="outlined" startIcon={<PlayArrow />} disabled={start.isPending} onClick={() => start.mutate(sprint.id)}>
            Start sprint
          </Button>
        )}
        {canManage && sprint.status === 'active' && (
          <Button size="small" variant="contained" startIcon={<TaskAlt />} onClick={() => setCompleteOpen(true)}>
            Complete sprint
          </Button>
        )}
        <Button size="small" startIcon={<ArrowDownward />} onClick={() => navigate('/tickets/reports')}>
          Reports
        </Button>
      </Stack>
      {sprint.goal && (
        <Typography variant="body2" color="text.secondary" mt={0.5}>Goal: {sprint.goal}</Typography>
      )}

      {sprint.status !== 'planned' && (
        <Box mt={1.5}>
          <BurndownChart points={burndown.data || []} />
        </Box>
      )}

      <Box mt={1.5}>
        <DroppableList id={`list:${sprint.id}`} emptyText="Drag tickets here from the backlog">
          {tickets.map(t => (
            <BacklogTicketRow key={t.key} ticket={t} sprints={snapshot.sprints.map(s => s.sprint)} onOpen={onOpen} onMoveSprint={onMoveSprint} />
          ))}
        </DroppableList>
      </Box>

      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Complete {sprint.name}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Done tickets stay in this sprint. Everything else has to move somewhere.
          </Typography>
          <TextField
            select
            fullWidth
            label="Move unfinished tickets to"
            value={destination}
            onChange={e => setDestination(e.target.value)}
          >
            <MenuItem value="backlog">Backlog</MenuItem>
            {snapshot.sprints.filter(s => s.sprint.id !== sprint.id && s.sprint.status !== 'completed')
              .map(s => <MenuItem key={s.sprint.id} value={s.sprint.id}>{s.sprint.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={complete.isPending} onClick={() => {
            complete.mutate({ id: sprint.id, moveUnfinishedTo: destination }, { onSuccess: () => setCompleteOpen(false) });
          }}>
            Complete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export function TicketBacklogPage() {
  const navigate = useNavigate();
  const perms = useTicketPermissions();
  const snapshotQ = useBacklog();
  const move = useMoveTicket();
  const createSprint = useCreateSprint();
  const [sprintOpen, setSprintOpen] = useState(false);
  const [form, setForm] = useState({ name: '', goal: '', startDate: '', endDate: '' });

  useTicketHotkeys({ onCreate: () => navigate('/tickets/new') });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const snapshot = snapshotQ.data;
  const allSprints: Sprint[] = snapshot?.sprints.map(s => s.sprint) || [];

  const resolveList = (listId: string): string | null =>
    listId === 'list:backlog' ? null : listId.replace('list:', '');

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const ticket = active.data.current?.ticket as Ticket | undefined;
    if (!ticket) return;

    const overId = String(over.id);
    let sprintId: string | null | undefined;
    let beforeKey: string | null = null;

    if (overId.startsWith('list:')) {
      sprintId = resolveList(overId);
    } else if (overId.startsWith('card:')) {
      const overTicket = findTicket(snapshot, overId.slice(5));
      if (!overTicket) return;
      sprintId = overTicket.sprintId;
      beforeKey = overTicket.key === ticket.key ? null : overTicket.key;
    } else return;

    if (sprintId === undefined) return;
    if (sprintId === ticket.sprintId && !beforeKey) return;
    move.mutate({ key: ticket.key, sprintId, beforeKey });
  };

  const onMoveSprint = (key: string, sprintId: string | null) => move.mutate({ key, sprintId });

  const submitSprint = async () => {
    try {
      await createSprint.mutateAsync(form);
      setSprintOpen(false);
      setForm({ name: '', goal: '', startDate: '', endDate: '' });
    } catch { /* toast handled by the mutation */ }
  };

  return (
    <>
      <PageHeader
        title="Backlog & sprints"
        subtitle="Drag tickets between the backlog and sprints, drop a card on another card to reorder. Keyboard: focus a card and press Space to lift it."
        breadcrumbs={[{ label: 'Tickets', to: '/tickets' }, { label: 'Backlog' }]}
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<Add />} disabled={!perms.canManageSprints} onClick={() => setSprintOpen(true)}>
              New sprint
            </Button>
            <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/tickets/new')}>
              New ticket
            </Button>
          </Stack>
        }
      />

      {snapshotQ.isLoading && <Typography color="text.secondary">Loading backlog…</Typography>}

      {snapshot && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>Backlog</Typography>
              <Chip size="small" label={snapshot.backlog.length} />
              <Typography variant="caption" color="text.secondary">sorted by priority</Typography>
              <Box flex={1} />
              <Typography variant="caption" color="text.secondary">
                total estimate {formatDuration(snapshot.backlog.reduce((a, t) => a + (t.originalEstimate || 0), 0))}
              </Typography>
            </Stack>
            <DroppableList id="list:backlog" emptyText="Drop a ticket here to send it back to the backlog">
              {snapshot.backlog.map(t => (
                <BacklogTicketRow key={t.key} ticket={t} sprints={allSprints} onOpen={k => navigate(`/tickets/${k}`)} onMoveSprint={onMoveSprint} />
              ))}
            </DroppableList>
          </Paper>

          {snapshot.sprints.map(({ sprint, tickets }) => (
            <SprintSection
              key={sprint.id}
              snapshot={snapshot}
              sprint={sprint}
              tickets={tickets}
              onOpen={k => navigate(`/tickets/${k}`)}
              onMoveSprint={onMoveSprint}
              canManage={perms.canManageSprints}
            />
          ))}

          {!snapshot.sprints.length && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No sprints yet — create one to start planning.</Typography>
            </Paper>
          )}
        </DndContext>
      )}

      <Dialog open={sprintOpen} onClose={() => setSprintOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create sprint</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Stack spacing={2}>
            <TextField autoFocus label="Sprint name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="Sprint goal" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} fullWidth multiline minRows={2} />
            <Stack direction="row" spacing={2}>
              <TextField type="date" label="Start" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField type="date" label="End" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<Close />} onClick={() => setSprintOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!form.name.trim() || !form.startDate || !form.endDate || createSprint.isPending} onClick={submitSprint}>
            {createSprint.isPending ? 'Creating…' : 'Create sprint'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function findTicket(snapshot: BacklogSnapshot | undefined, key: string): Ticket | undefined {
  if (!snapshot) return undefined;
  return snapshot.backlog.find(t => t.key === key)
    || snapshot.sprints.flatMap(s => s.tickets).find(t => t.key === key);
}
