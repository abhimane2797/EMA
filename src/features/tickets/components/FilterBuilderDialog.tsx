import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Switch, TextField,
  Typography,
} from '@mui/material';
import { Add, Close, Delete } from '@mui/icons-material';
import { AdvancedFilter, FilterField, FilterOperator, FilterRule, Sprint } from '../types';
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_TYPES } from '../constants';

const FIELDS: { value: FilterField; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'type', label: 'Type' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'reporter', label: 'Reporter' },
  { value: 'label', label: 'Label' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'storyPoints', label: 'Story points' },
  { value: 'title', label: 'Title' },
];

const ENUM_FIELDS: Partial<Record<FilterField, string[]>> = {
  status: TICKET_STATUSES,
  priority: TICKET_PRIORITIES,
  type: TICKET_TYPES,
};

const OPERATORS: Record<FilterField, FilterOperator[]> = {
  status: ['is', 'is not'],
  priority: ['is', 'is not'],
  type: ['is', 'is not'],
  assignee: ['is', 'is not', 'contains', 'is empty', 'is not empty'],
  reporter: ['is', 'is not', 'contains'],
  label: ['contains', 'not contains', 'is empty', 'is not empty'],
  sprint: ['is', 'is not', 'is empty', 'is not empty'],
  dueDate: ['>', '<', 'is empty', 'is not empty'],
  storyPoints: ['>', '<', 'is', 'is not'],
  title: ['contains', 'not contains', 'is', 'is not'],
};

const needsValue = (op: FilterOperator) => op !== 'is empty' && op !== 'is not empty';
const uid = () => Math.random().toString(36).slice(2, 9);

export function FilterBuilderDialog({
  open, value, sprints = [], users = [], onClose, onApply,
}: {
  open: boolean;
  value: AdvancedFilter | null;
  sprints?: Sprint[];
  users?: { id: string; name: string }[];
  onClose: () => void;
  onApply: (f: AdvancedFilter | null) => void;
}) {
  const [logic, setLogic] = useState<'AND' | 'OR'>(value?.logic || 'AND');
  const [rules, setRules] = useState<FilterRule[]>(
    value?.rules?.length ? value.rules : [{ id: uid(), field: 'status', operator: 'is', value: 'In Progress' }],
  );
  const [and, setAnd] = useState(true);

  const patch = (id: string, p: Partial<FilterRule>) => setRules(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)));

  const valueInput = (r: FilterRule) => {
    if (!needsValue(r.operator)) return null;
    if (r.field === 'assignee' || r.field === 'reporter') {
      return (
        <TextField
          select size="small" fullWidth label="Value" value={r.value}
          onChange={e => patch(r.id, { value: e.target.value })}
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value=""><em>Anyone</em></MenuItem>
          {users.map(u => <MenuItem key={u.id} value={u.name}>{u.name}</MenuItem>)}
        </TextField>
      );
    }
    if (r.field === 'sprint') {
      return (
        <TextField select size="small" fullWidth label="Value" value={r.value} onChange={e => patch(r.id, { value: e.target.value })}>
          <MenuItem value=""><em>Any sprint</em></MenuItem>
          <MenuItem value="__none__">No sprint</MenuItem>
          {sprints.map(s => <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>)}
        </TextField>
      );
    }
    const opts = ENUM_FIELDS[r.field];
    if (opts) {
      return (
        <TextField select size="small" fullWidth label="Value" value={r.value} onChange={e => patch(r.id, { value: e.target.value })}>
          {opts.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      );
    }
    return (
      <TextField
        size="small" fullWidth label="Value" value={r.value}
        onChange={e => patch(r.id, { value: e.target.value })}
        type={r.field === 'dueDate' ? 'date' : r.field === 'storyPoints' ? 'number' : 'text'}
        InputLabelProps={r.field === 'dueDate' ? { shrink: true } : undefined}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Advanced filter
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8 }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Typography variant="body2">Match</Typography>
          <Button variant={and ? 'contained' : 'outlined'} onClick={() => { setAnd(true); setLogic('AND'); }} sx={{ textTransform: 'none' }}>
            ALL (AND)
          </Button>
          <Button variant={!and ? 'contained' : 'outlined'} onClick={() => { setAnd(false); setLogic('OR'); }} sx={{ textTransform: 'none' }}>
            ANY (OR)
          </Button>
          <Typography variant="body2">of the following conditions</Typography>
        </Stack>

        <Stack spacing={1.5}>
          {rules.map(r => {
            const ops = OPERATORS[r.field] || ['is'];
            return (
              <Stack key={r.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField select size="small" label="Field" value={r.field} sx={{ minWidth: 150 }}
                  onChange={e => {
                    const f = e.target.value as FilterField;
                    const nextOps = OPERATORS[f];
                    patch(r.id, { field: f, operator: nextOps.includes(r.operator) ? r.operator : nextOps[0], value: '' });
                  }}
                >
                  {FIELDS.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Operator" value={r.operator} sx={{ minWidth: 150 }}
                  onChange={e => patch(r.id, { operator: e.target.value as FilterOperator })}
                >
                  {ops.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                </TextField>
                <Box flex={1}>{valueInput(r)}</Box>
                <IconButton
                  aria-label="Remove condition"
                  onClick={() => setRules(rs => rs.filter(x => x.id !== r.id))}
                  disabled={rules.length === 1}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}
        </Stack>

        <Button startIcon={<Add />} sx={{ mt: 1.5, textTransform: 'none' }} onClick={() =>
          setRules(rs => [...rs, { id: uid(), field: 'label', operator: 'contains', value: '' }])}
        >
          Add condition
        </Button>

        <Stack direction="row" alignItems="center" spacing={1} mt={2}>
          <Switch checked={logic === 'OR'} onChange={e => { setLogic(e.target.checked ? 'OR' : 'AND'); setAnd(!e.target.checked); }} />
          <Typography variant="caption" color="text.secondary">
            Off = match ALL conditions, on = match ANY.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<Close />} onClick={() => onApply(null)}>Remove filter</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onApply({ logic, rules })}>Apply</Button>
      </DialogActions>
    </Dialog>
  );
}
