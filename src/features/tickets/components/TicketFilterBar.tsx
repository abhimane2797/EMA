import { Box, Button, Chip, FormControlLabel, InputAdornment, MenuItem, Select, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { Clear, FilterList, Search } from '@mui/icons-material';
import { TicketFilterState, emptyTicketFilters, Sprint, TicketStatus, TicketPriority, TicketType } from '../types';
import { TICKET_STATUSES, STATUS_COLORS, TICKET_PRIORITIES, PRIORITY_COLORS, TICKET_TYPES } from '../constants';
import { SearchableSelect } from '../../../components/SearchableSelect';

interface UserLite { id: string; name: string }

const multiRender = (values: string[]) =>
  values.length ? <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{values.map(v => <Chip key={v} size="small" label={v} />)}</Box> : <Box sx={{ color: 'text.disabled', fontSize: 13 }}>Any</Box>;

export function TicketFilterBar({
  value, onChange, users, sprints = [], labels = [], onAdvanced, showOnlyMine = true, rightSlot,
}: {
  value: TicketFilterState;
  onChange: (next: TicketFilterState) => void;
  users: UserLite[];
  sprints?: Sprint[];
  labels?: string[];
  onAdvanced?: () => void;
  showOnlyMine?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const set = (patch: Partial<TicketFilterState>) => onChange({ ...value, ...patch });
  const dirty = JSON.stringify(value) !== JSON.stringify(emptyTicketFilters());

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="Search key, title, description…  (press /)"
          value={value.q}
          onChange={e => set({ q: e.target.value })}
          data-hotkey="search"
          sx={{ minWidth: 260, flex: '1 1 260px' }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
          }}
          inputProps={{ 'aria-label': 'Search tickets' }}
        />

        <Select
          multiple
          displayEmpty
          size="small"
          value={value.status}
          onChange={e => set({ status: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
          renderValue={multiRender}
          sx={{ minWidth: 150 }}
          aria-label="Filter by status"
        >
          <MenuItem disabled><Typography variant="caption" color="text.secondary">Status</Typography></MenuItem>
          {TICKET_STATUSES.map(s => (
            <MenuItem key={s} value={s}>
              <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: STATUS_COLORS[s as TicketStatus], mr: 1 }} />
              {s}
            </MenuItem>
          ))}
        </Select>

        <Select
          multiple
          displayEmpty
          size="small"
          value={value.priority}
          onChange={e => set({ priority: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
          renderValue={multiRender}
          sx={{ minWidth: 140 }}
          aria-label="Filter by priority"
        >
          <MenuItem disabled><Typography variant="caption" color="text.secondary">Priority</Typography></MenuItem>
          {TICKET_PRIORITIES.map(p => (
            <MenuItem key={p} value={p}>
              <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: PRIORITY_COLORS[p as TicketPriority], mr: 1 }} />
              {p}
            </MenuItem>
          ))}
        </Select>

        <Select
          multiple
          displayEmpty
          size="small"
          value={value.type}
          onChange={e => set({ type: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
          renderValue={multiRender}
          sx={{ minWidth: 130 }}
          aria-label="Filter by type"
        >
          <MenuItem disabled><Typography variant="caption" color="text.secondary">Type</Typography></MenuItem>
          {TICKET_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </Select>

        <Box sx={{ minWidth: 190 }}>
          <SearchableSelect
            label="Assignee"
            options={[{ label: 'Anyone', value: '' }, ...users.map(u => ({ label: u.name, value: u.id }))]}
            value={value.assignee || ''}
            onChange={v => set({ assignee: v || '' })}
          />
        </Box>

        <Box sx={{ minWidth: 170 }}>
          <SearchableSelect
            label="Sprint"
            options={[{ label: 'Any sprint', value: '' }, { label: 'No sprint (backlog)', value: 'none' }, ...sprints.map(s => ({ label: s.name, value: s.id }))]}
            value={value.sprintId || ''}
            onChange={v => set({ sprintId: v || '' })}
          />
        </Box>

        <Box sx={{ minWidth: 150 }}>
          <SearchableSelect
            label="Label"
            options={[{ label: 'Any label', value: '' }, ...labels.map(l => ({ label: l, value: l }))]}
            value={value.label || ''}
            onChange={v => set({ label: v || '' })}
          />
        </Box>

        {showOnlyMine && (
          <FormControlLabel
            control={<Switch size="small" checked={value.onlyMine} onChange={e => set({ onlyMine: e.target.checked })} />}
            label={<Typography variant="body2">Only mine</Typography>}
          />
        )}
        <FormControlLabel
          control={<Switch size="small" checked={value.overdue} onChange={e => set({ overdue: e.target.checked })} />}
          label={<Typography variant="body2">Overdue</Typography>}
        />

        <Box flex={1} />
        {rightSlot}
        {onAdvanced && (
          <Tooltip title="Build an AND/OR condition filter">
            <Button size="small" startIcon={<FilterList />} onClick={onAdvanced} sx={{ textTransform: 'none' }}>
              Advanced
            </Button>
          </Tooltip>
        )}
        {dirty && (
          <Button size="small" startIcon={<Clear />} onClick={() => onChange(emptyTicketFilters())} sx={{ textTransform: 'none' }}>
            Clear
          </Button>
        )}
      </Stack>
    </Box>
  );
}
