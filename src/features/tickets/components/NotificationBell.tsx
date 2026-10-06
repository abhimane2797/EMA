import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Box, Button, Divider, IconButton, Menu, MenuItem, Stack, Tooltip, Typography,
} from '@mui/material';
import { NotificationsNone, AssignmentTurnedIn, AlternateEmail, Schedule, Update } from '@mui/icons-material';
import { TicketNotification, NotificationKind } from '../types';
import { fmtDateTime } from '../../../utils';
import { relTime } from '../utils';
import { useMarkNotificationsRead, useNotifications } from '../api/queries';

const KIND_META: Record<NotificationKind, { color: string; Icon: any }> = {
  assigned: { color: 'primary.main', Icon: AssignmentTurnedIn },
  mentioned: { color: 'secondary.main', Icon: AlternateEmail },
  statusChanged: { color: 'info.main', Icon: Update },
  dueSoon: { color: 'warning.main', Icon: Schedule },
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { data = [] } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const unread = data.filter(n => !n.read);
  const list = [...data].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 20);

  const openTicket = (n: TicketNotification) => {
    if (!n.read) markRead.mutate([n.id]);
    setAnchor(null);
    navigate(`/tickets/${n.ticketKey}`);
  };

  return (
    <>
      <Tooltip title={`${unread.length} unread notification${unread.length === 1 ? '' : 's'}`}>
        <IconButton color="inherit" onClick={e => setAnchor(e.currentTarget)} aria-label="Notifications" data-testid="notification-bell">
          <Badge badgeContent={unread.length} color="error" max={9}>
            <NotificationsNone fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { width: 380, maxHeight: 460, mt: 1 } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
          <Button
            size="small"
            disabled={!unread.length || markRead.isPending}
            onClick={() => markRead.mutate('all')}
            sx={{ textTransform: 'none' }}
          >
            Mark all read
          </Button>
        </Box>
        <Divider />
        {list.length === 0 && (
          <MenuItem disabled sx={{ justifyContent: 'center', color: 'text.secondary' }}>
            Nothing here yet
          </MenuItem>
        )}
        {list.map(n => {
          const { color, Icon } = KIND_META[n.kind];
          return (
            <MenuItem
              key={n.id}
              onClick={() => openTicket(n)}
              sx={{
                alignItems: 'flex-start',
                gap: 1.25,
                bgcolor: n.read ? 'transparent' : 'action.hover',
                whiteSpace: 'normal',
                py: 1,
              }}
            >
              <Icon sx={{ color, fontSize: 18, mt: 0.25 }} />
              <Box flex={1} minWidth={0}>
                <Stack direction="row" spacing={1} alignItems="baseline">
                  <Typography variant="body2" fontWeight={n.read ? 500 : 700}>{n.ticketKey}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{relTime(n.createdAt)}</Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.primary', fontSize: 13 }}>{n.title}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {n.body} · {fmtDateTime(n.createdAt)}
                </Typography>
              </Box>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
