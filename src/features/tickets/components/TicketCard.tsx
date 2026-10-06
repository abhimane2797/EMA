import { useState } from 'react';
import {
  Avatar, Box, Card, Chip, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography,
} from '@mui/material';
import { MoreHoriz } from '@mui/icons-material';
import { Ticket, TicketStatus } from '../types';
import { WORKFLOW, STATUS_COLORS, formatDuration, initials, isOverdue } from '../constants';
import { TypeIcon } from './TypeIcon';
import { PriorityIcon, TicketStatusChip } from './TicketStatusChip';
import { LabelChips } from './LabelChips';
import { fmtDate } from '../../../utils';

export function MoveMenu({
  ticket, onMove, canMove = true, size = 'small',
}: {
  ticket: Ticket;
  onMove: (status: TicketStatus) => void;
  canMove?: boolean;
  size?: 'small' | 'medium';
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const options = WORKFLOW[ticket.status] || [];
  if (!canMove) return null;
  return (
    <>
      <Tooltip title="Move to…">
        <IconButton
          size={size}
          aria-label={`Move ${ticket.key} to another status`}
          onClick={e => { e.stopPropagation(); setAnchor(e.currentTarget); }}
          data-testid={`move-${ticket.key}`}
        >
          <MoreHoriz fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={e => e.stopPropagation()}
        PaperProps={{ sx: { minWidth: 200 } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1, display: 'block' }}>
          {ticket.key} · {ticket.status} →
        </Typography>
        {options.length === 0 && <MenuItem disabled>No transitions</MenuItem>}
        {options.map(s => (
          <MenuItem
            key={s}
            onClick={() => { setAnchor(null); onMove(s); }}
            sx={{ color: STATUS_COLORS[s], fontWeight: 600 }}
          >
            <ListItemIcon sx={{ minWidth: 24 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_COLORS[s] }} />
            </ListItemIcon>
            <ListItemText primary={s} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function TicketCard({
  ticket, onOpen, onMove, canMove, showStatus = true, showAssignee = true, style, dragHandle, sx,
}: {
  ticket: Ticket;
  onOpen: (key: string) => void;
  onMove?: (status: TicketStatus) => void;
  canMove?: boolean;
  showStatus?: boolean;
  showAssignee?: boolean;
  style?: React.CSSProperties;
  dragHandle?: React.HTMLAttributes<HTMLDivElement>;
  sx?: any;
}) {
  const overdue = isOverdue(ticket.dueDate, ticket.status);
  const progress = ticket.originalEstimate ? Math.min(100, Math.round((ticket.timeSpent / ticket.originalEstimate) * 100)) : null;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open ${ticket.key} ${ticket.title}`}
      onClick={() => onOpen(ticket.key)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(ticket.key); } }}
      sx={{
        p: 1.25,
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 0,
        borderRadius: 2,
        '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
        ...sx,
      }}
      style={style}
      {...(dragHandle || {})}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <TypeIcon type={ticket.type} size={15} />
        <Typography
          variant="caption"
          sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main', letterSpacing: 0.3 }}
        >
          {ticket.key}
        </Typography>
        <Box flex={1} />
        <PriorityIcon priority={ticket.priority} size={14} />
        {onMove && <MoveMenu ticket={ticket} onMove={onMove} canMove={canMove} />}
      </Stack>

      <Typography
        variant="body2"
        sx={{ mt: 0.75, fontWeight: 600, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {ticket.title}
      </Typography>

      <Stack direction="row" spacing={0.75} alignItems="center" mt={1} flexWrap="wrap" useFlexGap>
        {showStatus && <TicketStatusChip status={ticket.status} />}
        {ticket.storyPoints != null && (
          <Chip size="small" label={`${ticket.storyPoints} pts`} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
        )}
        {overdue && (
          <Chip size="small" color="error" variant="outlined" label={`Due ${fmtDate(ticket.dueDate)}`} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
        )}
        {!overdue && ticket.dueDate && ticket.status !== 'Done' && (
          <Typography variant="caption" color="text.secondary">{fmtDate(ticket.dueDate)}</Typography>
        )}
        {ticket.status === 'Done' && ticket.resolution && (
          <Chip size="small" label={ticket.resolution} sx={{ height: 20, fontSize: 11 }} />
        )}
        <Box flex={1} />
        {progress !== null && (
          <Tooltip title={`${formatDuration(ticket.timeSpent)} logged of ${formatDuration(ticket.originalEstimate)}`}>
            <Typography variant="caption" color={progress > 100 ? 'error.main' : 'text.secondary'}>{progress}%</Typography>
          </Tooltip>
        )}
        {showAssignee && ticket.assigneeName && (
          <Tooltip title={ticket.assigneeName}>
            <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: 'primary.light' }}>{initials(ticket.assigneeName)}</Avatar>
          </Tooltip>
        )}
        {showAssignee && !ticket.assigneeName && (
          <Chip size="small" variant="outlined" label="Unassigned" sx={{ height: 20, fontSize: 10 }} />
        )}
      </Stack>

      {ticket.labels.length > 0 && (
        <Box mt={0.75}>
          <LabelChips labels={ticket.labels} max={3} />
        </Box>
      )}
    </Card>
  );
}
