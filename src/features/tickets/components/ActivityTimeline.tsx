import {
  Timeline, TimelineConnector, TimelineContent, TimelineDot, TimelineItem, TimelineSeparator,
} from '@mui/lab';
import { Box, Stack, Typography } from '@mui/material';
import {
  AddComment, Attachment, CheckCircle, Create, DirectionsRun, EditNote, Link as LinkIcon, TaskAlt,
} from '@mui/icons-material';
import { ActivityEntry, ActivityKind } from '../types';
import { fmtDateTime } from '../../../utils';

const KIND_STYLE: Record<ActivityKind, { color: string; Icon: any }> = {
  created: { color: 'success.main', Icon: Create },
  status: { color: 'primary.main', Icon: TaskAlt },
  field: { color: 'warning.main', Icon: EditNote },
  comment: { color: 'info.main', Icon: AddComment },
  worklog: { color: 'secondary.main', Icon: CheckCircle },
  attachment: { color: 'default', Icon: Attachment },
  link: { color: 'default', Icon: LinkIcon },
  sprint: { color: 'primary.light', Icon: DirectionsRun },
  subtask: { color: 'default', Icon: TaskAlt },
};

export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  const sorted = [...entries].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  if (!sorted.length) {
    return <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>No activity yet.</Typography>;
  }
  return (
    <Timeline sx={{ p: 0, '& .MuiTimelineItem-root': { minHeight: 48, '&:before': { flex: 0, ml: 0, width: 20 } } }}>
      {sorted.map(e => {
        const { color, Icon } = KIND_STYLE[e.kind] || KIND_STYLE.field;
        return (
          <TimelineItem key={e.id}>
            <TimelineSeparator>
              <TimelineDot sx={{ bgcolor: color, color: '#fff', width: 26, height: 26, my: 'auto', '& svg': { fontSize: 15 } }}>
                <Icon />
              </TimelineDot>
              <TimelineConnector sx={{ bgcolor: 'divider' }} />
            </TimelineSeparator>
            <TimelineContent sx={{ py: '10px', px: 0 }}>
              <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{e.text}</Typography>
                <Typography variant="caption" color="text.secondary">{fmtDateTime(e.createdAt)}</Typography>
              </Stack>
              {(e.field || e.from || e.to) && (
                <Box mt={0.25}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {[e.field, e.from, e.to].filter(Boolean).join(' → ')}
                  </Typography>
                </Box>
              )}
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
