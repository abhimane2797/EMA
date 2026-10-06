import { Chip, Stack, Tooltip, Typography } from '@mui/material';
import {
  KeyboardArrowDown, KeyboardArrowUp, KeyboardDoubleArrowDown, KeyboardDoubleArrowUp, Remove,
} from '@mui/icons-material';
import { PRIORITY_COLORS, TICKET_PRIORITIES, STATUS_COLORS } from '../constants';
import { TicketPriority, TicketStatus } from '../types';

const PRIORITY_ICON: Record<TicketPriority, React.ReactNode> = {
  Highest: <KeyboardDoubleArrowUp fontSize="inherit" />,
  High: <KeyboardArrowUp fontSize="inherit" />,
  Medium: <Remove fontSize="inherit" />,
  Low: <KeyboardArrowDown fontSize="inherit" />,
  Lowest: <KeyboardDoubleArrowDown fontSize="inherit" />,
};

export function PriorityIcon({ priority, size = 16 }: { priority: TicketPriority; size?: number }) {
  return (
    <Tooltip title={priority}>
      <Stack
        direction="row"
        alignItems="center"
        component="span"
        sx={{ color: PRIORITY_COLORS[priority], gap: 0.25, flexWrap: 'wrap' }}
        aria-label={`Priority ${priority}`}
      >
        <span style={{ fontSize: size, display: 'inline-flex' }}>{PRIORITY_ICON[priority]}</span>
        <Typography
          component="span"
          sx={{ fontSize: Math.max(11, size - 4), fontWeight: 700, lineHeight: 1, letterSpacing: 0.2, color: 'inherit' }}
        >
          {priority}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

export function TicketStatusChip({
  status, size = 'small', sx,
}: { status: TicketStatus; size?: 'small' | 'medium'; sx?: any }) {
  return (
    <Chip
      size={size}
      label={status}
      aria-label={`Status ${status}`}
      sx={{
        bgcolor: STATUS_COLORS[status],
        color: '#fff',
        fontWeight: 700,
        minWidth: size === 'small' ? 78 : 96,
        ...sx,
      }}
    />
  );
}
