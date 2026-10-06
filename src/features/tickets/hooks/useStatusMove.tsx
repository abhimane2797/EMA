import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useUpdateTicketStatus } from '../api/queries';
import { TICKET_RESOLUTIONS } from '../constants';
import { TicketResolution, TicketStatus } from '../types';

/**
 * Keyboard-friendly "Move to…" action shared by the list, board and backlog.
 * A transition to Done opens the required resolution prompt first.
 */
export function useStatusMove() {
  const mutate = useUpdateTicketStatus();
  const [pending, setPending] = useState<{ key: string; status: TicketStatus } | null>(null);
  const [resolution, setResolution] = useState<TicketResolution>('Done');

  const move = (key: string, status: TicketStatus) => {
    if (status === 'Done') { setResolution('Done'); setPending({ key, status }); return; }
    mutate.mutate({ key, status, resolution: null });
  };

  const dialog = (
    <Dialog open={!!pending} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
      <DialogTitle>Close {pending?.key}</DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <Alert severity="info" sx={{ mb: 2 }}>A transition to Done requires a resolution.</Alert>
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
          disabled={mutate.isPending}
          onClick={() => {
            if (pending) mutate.mutate({ key: pending.key, status: 'Done', resolution });
            setPending(null);
          }}
        >
          Close ticket
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { move, dialog, isPending: mutate.isPending };
}
