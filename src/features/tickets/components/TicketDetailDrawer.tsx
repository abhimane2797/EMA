import { Box, Button, Chip, Divider, Drawer, Stack, Typography } from '@mui/material';
import { OpenInNew, Close } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { Ticket, TicketStatus } from '../types';
import { Markdown } from './Markdown';
import { PriorityIcon, TicketStatusChip } from './TicketStatusChip';
import { TypeIcon } from './TypeIcon';
import { LabelChips } from './LabelChips';
import { ActivityTimeline } from './ActivityTimeline';
import { useTicket } from '../api/queries';
import { fmtDate, fmtDateTime } from '../../../utils';
import { formatDuration, isOverdue } from '../constants';

/** Quick preview drawer — full detail stays one click away. */
export function TicketDetailDrawer({
  ticketKey, open, onClose, onOpenFull,
}: {
  ticketKey: string | null;
  open: boolean;
  onClose: () => void;
  onOpenFull?: (key: string) => void;
}) {
  const bundleQ = useTicket(open ? ticketKey || undefined : undefined);
  const t = bundleQ.data?.ticket;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          {t ? t.key : 'Ticket preview'}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close preview"><Close /></IconButton>
      </Stack>

      <Box sx={{ p: 2, overflowY: 'auto' }}>
        {bundleQ.isLoading && <Typography color="text.secondary">Loading…</Typography>}
        {t && (
          <>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <TypeIcon type={t.type} size={18} />
              <TicketStatusChip status={t.status} />
              <PriorityIcon priority={t.priority} size={15} />
              <Box flex={1} />
              {isOverdue(t.dueDate, t.status) && <Chip size="small" color="error" label="Overdue" />}
            </Stack>

            <Typography variant="h6" fontWeight={700} gutterBottom>{t.title}</Typography>

            <Stack direction="row" spacing={2} mb={1.5} flexWrap="wrap" useFlexGap>
              <Box>
                <Typography variant="caption" color="text.secondary">Assignee</Typography>
                <Typography variant="body2">{t.assigneeName || 'Unassigned'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Reporter</Typography>
                <Typography variant="body2">{t.reporterName}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Due</Typography>
                <Typography variant="body2">{t.dueDate ? fmtDate(t.dueDate) : '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Logged</Typography>
                <Typography variant="body2">{formatDuration(t.timeSpent)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Updated</Typography>
                <Typography variant="body2">{fmtDateTime(t.updatedAt)}</Typography>
              </Box>
            </Stack>

            {t.labels.length > 0 && <LabelChips labels={t.labels} max={8} />}

            <Divider sx={{ my: 1.5 }} />
            <Markdown>{t.description}</Markdown>

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Comments {bundleQ.data ? `(${bundleQ.data.comments.length})` : ''}
            </Typography>
            {(bundleQ.data?.comments || []).slice(0, 3).map(c => (
              <Box key={c.id} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">{c.authorName} · {fmtDateTime(c.createdAt)}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.body}</Typography>
              </Box>
            ))}

            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2" color="text.secondary" mb={0.5}>Recent activity</Typography>
            <ActivityTimeline entries={(bundleQ.data?.activity || []).slice(0, 6)} />

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 2 }}
              endIcon={<OpenInNew />}
              onClick={() => (onOpenFull || (() => {}))(t.key)}
            >
              Open full ticket
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
}

export type { Ticket, TicketStatus };
