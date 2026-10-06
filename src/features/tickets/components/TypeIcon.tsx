import { Tooltip } from '@mui/material';
import { AutoAwesome, BugReport, CheckCircleOutline, MenuBook, ReportProblem } from '@mui/icons-material';
import { TicketType } from '../types';

const TYPE_META: Record<TicketType, { color: string; Icon: any; label: string }> = {
  Bug: { color: '#DC2626', Icon: BugReport, label: 'Bug' },
  Task: { color: '#1A56DB', Icon: CheckCircleOutline, label: 'Task' },
  Story: { color: '#059669', Icon: MenuBook, label: 'Story' },
  Improvement: { color: '#7C3AED', Icon: AutoAwesome, label: 'Improvement' },
  Incident: { color: '#E56910', Icon: ReportProblem, label: 'Incident' },
};

export function TypeIcon({ type, size = 16, showLabel = false }: { type: TicketType; size?: number; showLabel?: boolean }) {
  const { color, Icon, label } = TYPE_META[type] || TYPE_META.Task;
  return (
    <Tooltip title={label}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color }} aria-label={`Type ${label}`}>
        <Icon sx={{ fontSize: size }} />
        {showLabel && (
          <span style={{ fontSize: size - 3, fontWeight: 600, color: 'text.secondary' }}>{label}</span>
        )}
      </span>
    </Tooltip>
  );
}
