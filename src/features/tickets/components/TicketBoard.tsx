import { useMemo, useRef, useState } from 'react';
import {
  closestCorners, DndContext, DragEndEvent, DragOverEvent, DragStartEvent, KeyboardSensor, PointerSensor,
  useDraggable, useSensor, useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Box, Button, Chip, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { Add, Close } from '@mui/icons-material';
import { Ticket, TicketStatus } from '../types';
import { BOARD_COLUMNS, STATUS_COLORS, canTransition } from '../constants';
import { TicketCard } from './TicketCard';

/** Card registered with dnd-kit so it can be dragged by pointer or keyboard (Space to lift, arrows to move, Space to drop). */
export function DraggableTicketCard(props: { ticket: Ticket } & Omit<React.ComponentProps<typeof TicketCard>, 'ticket'>) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card:${props.ticket.key}`,
    data: { ticket: props.ticket },
  });
  return (
    <Box
      ref={setNodeRef}
      sx={{ display: 'contents', opacity: isDragging ? 0.35 : 1 }}
    >
      <TicketCard {...props} dragHandle={{ ...listeners, ...attributes } as any} />
    </Box>
  );
}
import { toast } from '../store/toastStore';

export type BoardLane = 'none' | 'assignee' | 'priority' | 'type';

export const LANE_LABEL: Record<BoardLane, string> = {
  none: 'No swimlanes',
  assignee: 'Assignee',
  priority: 'Priority',
  type: 'Type',
};

const laneOf = (t: Ticket, lane: BoardLane): string => {
  switch (lane) {
    case 'assignee': return t.assigneeId || 'unassigned';
    case 'priority': return t.priority;
    case 'type': return t.type;
    default: return 'all';
  }
};

export const laneName = (t: Ticket, lane: BoardLane): string => {
  if (lane === 'assignee') return t.assigneeName || 'Unassigned';
  if (lane === 'priority') return t.priority;
  if (lane === 'type') return t.type;
  return '';
};

function DroppableColumn({
  id, status, tickets, lane, onOpen, onMove, canMove, renderCard, children, hideHeader,
}: {
  id: string;
  status: TicketStatus;
  tickets: Ticket[];
  lane: BoardLane;
  onOpen: (key: string) => void;
  onMove?: (key: string, s: TicketStatus) => void;
  canMove?: (t: Ticket) => boolean;
  renderCard?: (t: Ticket) => React.ReactNode;
  children?: React.ReactNode;
  hideHeader?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 248, maxWidth: 248, flex: '0 0 248px' }}>
      {!hideHeader && (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, px: 0.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[status] }} />
        <Typography variant="subtitle2" fontWeight={700}>{status}</Typography>
        <Chip size="small" label={tickets.length} sx={{ height: 20, minWidth: 26, fontSize: 11 }} />
        <Box flex={1} />
        {children}
      </Stack>
      )}
      <Box
        sx={{
          flex: 1, minHeight: 320, p: 1, borderRadius: 2, bgcolor: 'grey.50',
          border: '1px dashed', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.25,
        }}
      >
        {tickets.map(t => renderCard ? renderCard(t) : (
          <DraggableTicketCard key={t.key} ticket={t} onOpen={onOpen} onMove={onMove ? s => onMove(t.key, s) : undefined} canMove={canMove?.(t)} />
        ))}
        {!tickets.length && (
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            Drop a ticket here
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function TicketBoard({
  tickets, lane = 'none', onOpen, onMove, canMove, onQuickCreate, canCreate = true, loading,
}: {
  tickets: Ticket[];
  lane?: BoardLane;
  onOpen: (key: string) => void;
  onMove?: (key: string, status: TicketStatus) => void;
  canMove?: (t: Ticket) => boolean;
  onQuickCreate?: (input: { title: string; status: TicketStatus }) => void;
  canCreate?: boolean;
  loading?: boolean;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [quickStatus, setQuickStatus] = useState<TicketStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const lanes = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    tickets.forEach(t => {
      const k = laneOf(t, lane);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    });
    return map;
  }, [tickets, lane]);

  const laneKeys = lane === 'none' ? ['all'] : Array.from(lanes.keys());
  const laneTitle = (k: string) => {
    if (lane === 'assignee') {
      const t = tickets.find(x => (x.assigneeId || 'unassigned') === k);
      return t ? (t.assigneeName || 'Unassigned') : 'Unassigned';
    }
    return k;
  };

  const onDragStart = (e: DragStartEvent) => setActiveKey((e.active.data.current?.ticket as Ticket)?.key || null);

  const onDragOver = (_e: DragOverEvent) => { /* preview derived from optimistic state */ };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveKey(null);
    const { active, over } = e;
    if (!over) return;
    const ticket = active.data.current?.ticket as Ticket | undefined;
    if (!ticket) return;

    let target: { status: TicketStatus; laneId: string } | null = null;
    const overId = String(over.id);
    if (overId.startsWith('col:')) {
      const [, rest] = overId.split('col:');
      const [status, laneId] = rest.split('|');
      target = { status: status as TicketStatus, laneId: laneId || 'all' };
    } else if (overId.startsWith('card:')) {
      const overTicket = tickets.find(t => t.key === overId.slice(5));
      if (overTicket) target = { status: overTicket.status, laneId: laneOf(overTicket, lane) };
    }
    if (!target) return;

    const sameLane = laneOf(ticket, lane) === target.laneId;
    if (target.status === ticket.status && sameLane) return;
    if (lane !== 'none' && !sameLane && target.status === ticket.status) {
      toast('Swimlane changes are not drag enabled — use the move menu', 'info');
      return;
    }
    if (!canTransition(ticket.status, target.status)) {
      toast(`${ticket.status} → ${target.status} is not a valid transition`, 'error');
      return;
    }
    onMove?.(ticket.key, target.status);
  };

  const activeTicket = tickets.find(t => t.key === activeKey);

  if (loading) {
    return <Stack direction="row" spacing={2}>{BOARD_COLUMNS.map(s => (
      <Paper key={s} sx={{ minWidth: 248, minHeight: 360, p: 2 }}><Typography variant="subtitle2">{s}</Typography></Paper>
    ))}</Stack>;
  }

  const quickAddBtn = (status: TicketStatus) => canCreate && (
    <Tooltip title="Add ticket in this status">
      <IconButton
        size="small"
        aria-label={`Add ticket to ${status}`}
        onClick={() => { setQuickStatus(status); setQuickTitle(''); setTimeout(() => quickRef.current?.focus(), 0); }}
      >
        <Add fontSize="inherit" />
      </IconButton>
    </Tooltip>
  );

  const filtered = (status: TicketStatus, laneId?: string) =>
    tickets.filter(t => t.status === status || (status === 'To Do' && t.status === 'Reopened'))
      .filter(t => (laneId === undefined || laneId === 'all' ? true : laneOf(t, lane) === laneId));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      {lane === 'none' ? (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
          {BOARD_COLUMNS.map(status => (
            <DroppableColumn
              key={status}
              id={`col:${status}`}
              status={status}
              lane={lane}
              tickets={filtered(status)}
              onOpen={onOpen}
              onMove={onMove}
              canMove={canMove}
            >
              {quickAddBtn(status)}
            </DroppableColumn>
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper', pb: 0.5 }}>
            <Box sx={{ flex: '0 0 180px', minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">Swimlane · {LANE_LABEL[lane]}</Typography>
            </Box>
            {BOARD_COLUMNS.map(status => (
              <Box key={status} sx={{ flex: '0 0 248px', minWidth: 248, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[status] }} />
                <Typography variant="subtitle2" fontWeight={700}>{status}</Typography>
              </Box>
            ))}
          </Stack>

          {laneKeys.map(k => (
            <Stack key={k} direction="row" spacing={2} alignItems="flex-start">
              <Box sx={{ flex: '0 0 180px', minWidth: 180, pt: 1 }}>
                <Chip size="small" label={`${laneTitle(k)} · ${lanes.get(k)?.length || 0}`} sx={{ maxWidth: 170 }} />
              </Box>
              {BOARD_COLUMNS.map(status => (
                <DroppableColumn
                  key={status}
                  id={`col:${status}|${k}`}
                  status={status}
                  lane={lane}
                  hideHeader
                  tickets={filtered(status, k)}
                  onOpen={onOpen}
                  onMove={onMove}
                  canMove={canMove}
                />
              ))}
            </Stack>
          ))}
        </Box>
      )}

      {quickStatus && (
        <Paper sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1400, p: 2, width: 420 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={quickStatus} sx={{ bgcolor: STATUS_COLORS[quickStatus], color: '#fff', fontWeight: 700 }} />
            <TextField
              inputRef={quickRef}
              size="small"
              fullWidth
              autoFocus
              placeholder="Ticket summary — press Enter to create"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && quickTitle.trim().length >= 4 && onQuickCreate) {
                  onQuickCreate({ title: quickTitle.trim(), status: quickStatus });
                  setQuickTitle('');
                  setQuickStatus(null);
                }
                if (e.key === 'Escape') setQuickStatus(null);
              }}
              inputProps={{ 'aria-label': 'New ticket summary' }}
            />
            <Button size="small" variant="contained" disabled={quickTitle.trim().length < 4}
              onClick={() => {
                if (!onQuickCreate) return;
                onQuickCreate({ title: quickTitle.trim(), status: quickStatus });
                setQuickTitle('');
                setQuickStatus(null);
              }}>
              Add
            </Button>
            <IconButton size="small" onClick={() => setQuickStatus(null)} aria-label="Cancel quick create"><Close fontSize="inherit" /></IconButton>
          </Stack>
        </Paper>
      )}

      {activeTicket && (
        <Box sx={{ position: 'fixed', top: 20, right: 24, zIndex: 1500, pointerEvents: 'none', width: 260, opacity: 0.95 }}>
          <TicketCard ticket={activeTicket} onOpen={() => undefined} sx={{ boxShadow: 6 }} />
        </Box>
      )}
    </DndContext>
  );
}
