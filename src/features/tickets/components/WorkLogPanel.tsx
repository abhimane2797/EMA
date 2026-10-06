import { useState } from 'react';
import { Box, Button, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { Delete, Timer } from '@mui/icons-material';
import { Ticket, WorkLog } from '../types';
import { fmtDate, fmtDateTime } from '../../../utils';
import { formatDuration, parseDuration } from '../constants';
import { useAddWorkLog, useDeleteWorkLog } from '../api/queries';
import { useTicketPermissions } from '../permissions';

export function WorkLogPanel({ ticket, workLogs }: { ticket: Ticket; workLogs: WorkLog[] }) {
  const perms = useTicketPermissions();
  const addWorkLog = useAddWorkLog();
  const delWorkLog = useDeleteWorkLog();
  const [duration, setDuration] = useState('');
  const [spentAt, setSpentAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  const canLog = perms.canLogTime(ticket);
  const hours = parseDuration(duration);
  const total = workLogs.reduce((s, w) => s + w.hours, 0);

  const submit = async () => {
    if (!hours || hours <= 0) return;
    await addWorkLog.mutateAsync({ key: ticket.key, input: { hours, spentAt, note: note.trim() } });
    setDuration(''); setNote('');
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={1.5} flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2">Time logged: <b>{formatDuration(total)}</b></Typography>
        {ticket.originalEstimate != null && (
          <Typography variant="caption" color="text.secondary">
            of {formatDuration(ticket.originalEstimate)} estimated ·{' '}
            {formatDuration(Math.max(0, (ticket.originalEstimate ?? 0) - total))} remaining
          </Typography>
        )}
        <Box flex={1} />
        <Timer sx={{ color: 'text.secondary', fontSize: 18 }} />
      </Stack>

      {canLog && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2}>
          <TextField
            size="small"
            label="Spent"
            placeholder="e.g. 2h 30m"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            error={!!duration && hours === null}
            helperText={duration && hours === null ? 'Use 2h, 30m or 2.5' : ' '}
            sx={{ width: 150 }}
            inputProps={{ 'aria-label': 'Time spent' }}
          />
          <TextField
            size="small"
            type="date"
            label="Date"
            value={spentAt}
            onChange={e => setSpentAt(e.target.value)}
            sx={{ width: 170 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label="Note"
            value={note}
            onChange={e => setNote(e.target.value)}
            fullWidth
            inputProps={{ 'aria-label': 'Work log note' }}
          />
          <Button
            variant="contained"
            disabled={!hours || hours <= 0 || addWorkLog.isPending}
            onClick={submit}
          >
            Log time
          </Button>
        </Stack>
      )}

      {workLogs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          No time logged yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Spent</TableCell>
              <TableCell>Note</TableCell>
              {canLog && <TableCell align="right" width={48} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...workLogs].sort((a, b) => +new Date(b.spentAt) - +new Date(a.spentAt)).map(w => (
              <TableRow key={w.id} hover>
                <TableCell>{w.authorName}</TableCell>
                <TableCell>
                  <Tooltip title={fmtDateTime(w.createdAt)}>
                    <span>{fmtDate(w.spentAt)}</span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right"><b>{formatDuration(w.hours)}</b></TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{w.note}</TableCell>
                {canLog && (
                  <TableCell align="right">
                    <IconButton size="small" aria-label="Delete work log" onClick={() => delWorkLog.mutate({ key: ticket.key, workLogId: w.id })}>
                      <Delete fontSize="inherit" sx={{ fontSize: 15 }} />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
