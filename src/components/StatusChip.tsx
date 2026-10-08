import { Chip } from '@mui/material';
import { statusColor } from '../utils';

export function StatusChip({ status, size='small' }: { status:string, size?: 'small'|'medium' }) {
  return <Chip label={status} color={statusColor(status) as any} size={size} variant={status==='New' ? 'outlined' : 'filled'} sx={{ fontWeight:600, minWidth:84 }} />;
}
export function PriorityChip({ priority }: { priority:string }) {
  const map: any = { Critical:'error', High:'warning', Medium:'info', Low:'default' };
  return <Chip label={priority} color={map[priority]||'default'} size="small" sx={{ fontWeight:700 }} />;
}
export function SeverityChip({ severity }: { severity:string }) {
  const map: any = { Low:'default', Medium:'info', High:'warning', Critical:'error' };
  return <Chip label={severity} color={map[severity]||'default'} size="small" variant="outlined" />;
}
