import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField,
} from '@mui/material';
import { WORKFLOW, TICKET_RESOLUTIONS, STATUS_COLORS } from '../constants';
import { TicketResolution, TicketStatus } from '../types';
import { toast } from '../store/toastStore';

/**
 * Status control limited to the workflow transitions of the current status.
 * Moving to Done opens a resolution dialog; Done only offers Reopened.
 */
export function StatusSelect({
  value, onChange, disabled, size = 'medium', ticketKey, testId,
}: {
  value: TicketStatus;
  onChange: (status: TicketStatus, resolution?: TicketResolution | null) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  ticketKey?: string;
  testId?: string;
}) {
  const options = WORKFLOW[value] || [];
  const [pending, setPending] = useState<TicketStatus | null>(null);
  const [resolution, setResolution] = useState<TicketResolution>('Done');

  const handleSelect = (to: TicketStatus) => {
    if (to === 'Done') { setResolution('Done'); setPending(to); return; }
    onChange(to, value === 'Done' ? null : undefined);
  };

  return (
    <>
      <TextField
        select
        size={size}
        value={value}
        disabled={disabled || !options.length}
        onChange={e => handleSelect(e.target.value as TicketStatus)}
        SelectProps={{ native: false }}
        inputProps={{ 'data-testid': testId || 'status-select' }}
        sx={{ minWidth: 150, '& .MuiSelect-select': { fontWeight: 700, color: '#fff !important' } }}
        variant="filled"
        InputProps={{
          disableUnderline: true,
          sx: { bgcolor: STATUS_COLORS[value], borderRadius: 1, px: 1, minHeight: size === 'small' ? 28 : 40 },
        }}
        aria-label="Change status"
      >
        <MenuItem value={value} disabled>{value} (current)</MenuItem>
        {options.map(s => (
          <MenuItem key={s} value={s}>
            <span style={{ fontWeight: 600 }}>{s}</span>
          </MenuItem>
        ))}
      </TextField>

      <Dialog open={pending === 'Done'} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Close {ticketKey || 'ticket'}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            A transition to Done requires a resolution.
          </Alert>
          <TextField
            select
            fullWidth
            label="Resolution"
            value={resolution}
            onChange={e => setResolution(e.target.value as TicketResolution)}
            inputProps={{ 'aria-label': 'Resolution' }}
          >
            {TICKET_RESOLUTIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => { onChange('Done', resolution); setPending(null); toast('Resolution recorded', 'success'); }}
          >
            Close ticket
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
