import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, Divider, IconButton, Menu, MenuItem, Stack, TextField, Toolbar, Tooltip, Typography,
} from '@mui/material';
import { Add, FileDownload, Delete, Save, ViewList, PlaylistAddCheck, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable, Column } from '../../../components/DataTable';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { downloadCSV, fmtDateTime } from '../../../utils';
import {
  AdvancedFilter, emptyTicketFilters, Sprint, Ticket, TicketFilterState, TicketPriority, TicketStatus,
} from '../types';
import { filterStateToParams, isOverdue, STATUS_COLORS, TICKET_PRIORITIES, PRIORITY_RANK } from '../constants';
import { TicketFilterBar } from '../components/TicketFilterBar';
import { FilterBuilderDialog } from '../components/FilterBuilderDialog';
import { PriorityIcon, TicketStatusChip } from '../components/TicketStatusChip';
import { TypeIcon } from '../components/TypeIcon';
import { MoveMenu } from '../components/TicketCard';
import { useBulkTickets, useSprints, useTickets, useTicketSettings, useTicketUsers } from '../api/queries';
import { useStatusMove } from '../hooks/useStatusMove';
import { useTicketPermissions } from '../permissions';
import { toast } from '../store/toastStore';

interface SavedView { name: string; filter: TicketFilterState; advanced: AdvancedFilter | null }
const VIEWS_KEY = 'ema.ticket.views';

const loadViews = (): SavedView[] => {
  try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]'); } catch { return []; }
};

export function TicketListPage() {
  const navigate = useNavigate();
  const perms = useTicketPermissions();
  const [params, setParams] = useSearchParams();

  const [filters, setFilters] = useState<TicketFilterState>(() => ({
    ...emptyTicketFilters(),
    q: params.get('q') || '',
    status: params.getAll('status'),
    priority: params.getAll('priority'),
    type: params.getAll('type'),
    assignee: params.get('assignee') || '',
    sprintId: params.get('sprintId') || '',
    onlyMine: params.get('onlyMine') === 'true',
    overdue: params.get('overdue') === 'true',
  }));
  const [advanced, setAdvanced] = useState<AdvancedFilter | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sort, setSort] = useState<'updatedAt' | 'createdAt' | 'priority' | 'dueDate' | 'key'>('updatedAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [views, setViews] = useState<SavedView[]>(loadViews);
  const [viewsAnchor, setViewsAnchor] = useState<HTMLElement | null>(null);
  const [saveAnchor, setSaveAnchor] = useState<HTMLElement | null>(null);
  const [viewName, setViewName] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const usersQ = useTicketUsers();
  const sprintsQ = useSprints();
  const settingsQ = useTicketSettings();
  const users = (usersQ.data || []).map(u => ({ id: u.id, name: u.employeeName }));

  const queryParams = useMemo(() => ({
    ...filterStateToParams(filters),
    onlyMine: filters.onlyMine ? perms.user?.id : undefined,
    advanced: advanced || undefined,
    sortBy: sort,
    sortDir: dir,
    page,
    pageSize,
  }), [filters, advanced, sort, dir, page, pageSize, perms.user?.id]);

  const ticketsQ = useTickets(queryParams);

  useEffect(() => { setPage(1); }, [filters, advanced, sort, dir]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.q) next.set('q', filters.q);
    filters.status.forEach(s => next.append('status', s));
    filters.priority.forEach(s => next.append('priority', s));
    filters.type.forEach(s => next.append('type', s));
    if (filters.assignee) next.set('assignee', filters.assignee);
    if (filters.sprintId) next.set('sprintId', filters.sprintId);
    if (filters.onlyMine) next.set('onlyMine', 'true');
    if (filters.overdue) next.set('overdue', 'true');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const bulk = useBulkTickets();
  const statusMove = useStatusMove();
  const rows = ticketsQ.data?.data || [];
  const total = ticketsQ.data?.total || 0;

  const exportCsv = () => {
    downloadCSV(rows.map(t => ({
      key: t.key, title: t.title, type: t.type, status: t.status, priority: t.priority, severity: t.severity,
      assignee: t.assigneeName || '', reporter: t.reporterName, sprint: t.sprintId || 'Backlog',
      labels: t.labels.join(' | '), dueDate: t.dueDate || '', storyPoints: t.storyPoints ?? '',
      created: t.createdAt, updated: t.updatedAt,
    })), `tickets-${new Date().toISOString().slice(0, 10)}.csv`);
    toast('CSV exported', 'success');
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) { toast('Give the view a name', 'warning'); return; }
    const next = [...views.filter(v => v.name !== name), { name, filter: filters, advanced }];
    setViews(next);
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    setViewName('');
    setSaveAnchor(null);
    toast(`View “${name}” saved`, 'success');
  };

  const columns: Column<Ticket>[] = [
    {
      id: 'key', label: 'Key', minWidth: 96,
      render: t => (
        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>{t.key}</Typography>
      ),
    },
    {
      id: 'title', label: 'Summary', minWidth: 320,
      render: t => (
        <Stack direction="row" spacing={1} alignItems="center">
          <TypeIcon type={t.type} size={15} />
          <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.title}
          </Typography>
          {isOverdue(t.dueDate, t.status) && <Chip size="small" color="error" label="Overdue" sx={{ height: 18, fontSize: 10 }} />}
        </Stack>
      ),
    },
    { id: 'status', label: 'Status', minWidth: 110, render: t => <TicketStatusChip status={t.status} /> },
    { id: 'priority', label: 'Priority', minWidth: 110, render: t => <PriorityIcon priority={t.priority} /> },
    { id: 'assignee', label: 'Assignee', minWidth: 150, render: t => t.assigneeName || <Typography variant="caption" color="text.secondary">Unassigned</Typography> },
    { id: 'reporter', label: 'Reporter', minWidth: 140, render: t => <Typography variant="body2">{t.reporterName}</Typography> },
    {
      id: 'sprint', label: 'Sprint', minWidth: 130,
      render: t => t.sprintId
        ? <Chip size="small" variant="outlined" label={(sprintsQ.data || []).find(s => s.id === t.sprintId)?.name || t.sprintId} />
        : <Chip size="small" label="Backlog" />,
    },
    { id: 'dueDate', label: 'Due', minWidth: 100, render: t => t.dueDate ? fmtDateTime(`${t.dueDate}T00:00:00`).split(',')[0] : '—' },
    { id: 'updatedAt', label: 'Updated', minWidth: 140, render: t => fmtDateTime(t.updatedAt) },
    {
      id: 'actions', label: '', minWidth: 48,
      render: t => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <MoveMenu ticket={t} canMove={perms.canChangeStatus(t)} onMove={s => statusMove.move(t.key, s)} />
        </Stack>
      ),
    },
  ];

  const selectedTickets = rows.filter(t => selected.includes(t.id));
  const canBulk = perms.canBulk && selectedTickets.length > 0;

  return (
    <>
      <PageHeader
        title="Tickets"
        subtitle={`${total} ticket${total === 1 ? '' : 's'} match the current filters`}
        breadcrumbs={[{ label: 'Tickets' }, { label: 'List' }]}
        action={
          <Stack direction="row" spacing={1}>
            <Tooltip title="Export the visible page as CSV">
              <span><Button size="small" startIcon={<FileDownload />} onClick={exportCsv} disabled={!rows.length}>Export</Button></span>
            </Tooltip>
            <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => navigate('/tickets/new')}>
              New ticket
            </Button>
          </Stack>
        }
      />

      <TicketFilterBar
        value={filters}
        onChange={setFilters}
        users={users}
        sprints={sprintsQ.data || []}
        labels={settingsQ.data?.labels || []}
        onAdvanced={() => setAdvancedOpen(true)}
        rightSlot={
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Saved views"><IconButton size="small" onClick={e => setViewsAnchor(e.currentTarget)} aria-label="Saved views"><ViewList fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Save this view"><IconButton size="small" onClick={e => setSaveAnchor(e.currentTarget)} aria-label="Save view"><Save fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Sort">
              <Stack direction="row" spacing={0}>
                <IconButton size="small" onClick={() => setDir(d => (d === 'asc' ? 'desc' : 'asc'))} aria-label="Toggle sort direction">
                  {dir === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
                </IconButton>
              </Stack>
            </Tooltip>
            <TextField
              select
              size="small"
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              sx={{ minWidth: 130 }}
              SelectProps={{ native: false }}
              inputProps={{ 'aria-label': 'Sort field' }}
            >
              <MenuItem value="updatedAt">Updated</MenuItem>
              <MenuItem value="createdAt">Created</MenuItem>
              <MenuItem value="priority">Priority</MenuItem>
              <MenuItem value="dueDate">Due date</MenuItem>
              <MenuItem value="key">Key</MenuItem>
            </TextField>
          </Stack>
        }
      />

      <Menu anchorEl={viewsAnchor} open={Boolean(viewsAnchor)} onClose={() => setViewsAnchor(null)}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, pt: 1 }}>Saved views</Typography>
        {views.length === 0 && <MenuItem disabled>No saved views yet</MenuItem>}
        {views.map(v => (
          <MenuItem
            key={v.name}
            onClick={() => { setFilters(v.filter); setAdvanced(v.advanced); setViewsAnchor(null); }}
          >
            <ListItemTextish name={v.name} onDelete={() => {
              const next = views.filter(x => x.name !== v.name);
              setViews(next);
              localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
            }} />
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={saveAnchor} open={Boolean(saveAnchor)} onClose={() => setSaveAnchor(null)} PaperProps={{ sx: { p: 1.5, minWidth: 300 } }}>
        <Stack spacing={1}>
          <TextField
            autoFocus
            size="small"
            label="View name"
            value={viewName}
            onChange={e => setViewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveView(); }}
            inputProps={{ 'aria-label': 'View name' }}
          />
          <Button variant="contained" startIcon={<Save />} onClick={saveView}>Save current filters</Button>
        </Stack>
      </Menu>

      {advanced && (
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <PlaylistAddCheck fontSize="small" color="primary" />
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`Advanced: ${advanced.rules.length} ${advanced.logic} condition${advanced.rules.length === 1 ? '' : 's'}`}
            onDelete={() => setAdvanced(null)}
          />
        </Stack>
      )}

      {canBulk && (
        <Toolbar sx={{ px: 2, py: 0.5, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>{selected.length} selected</Typography>
          <BulkAction label="Assign to…" onPick={async id => {
            const name = users.find(u => u.id === id)?.name || 'Unassigned';
            await bulk.mutateAsync({ keys: selected, action: 'assign', payload: { assigneeId: id || null } });
            toast(`Assigned ${selected.length} ticket(s) to ${name}`, 'success');
            setSelected([]);
          }} options={users} />
          {perms.canEditCore && (
            <BulkAction label="Priority…" onPick={async p => {
              await bulk.mutateAsync({ keys: selected, action: 'priority', payload: { priority: p as TicketPriority } });
              setSelected([]);
            }} options={TICKET_PRIORITIES.map(p => ({ id: p, name: p }))} />
          )}
          {perms.canManageSprints && (
            <BulkAction label="Sprint…" onPick={async id => {
              await bulk.mutateAsync({ keys: selected, action: 'sprint', payload: { sprintId: id || null } });
              setSelected([]);
            }} options={[...(sprintsQ.data || []).map(s => ({ id: s.id, name: s.name })), { id: '', name: 'Backlog' }]} />
          )}
          {perms.canDelete && (
            <Button size="small" color="inherit" startIcon={<Delete />} onClick={() => setConfirmDelete(true)}>Delete</Button>
          )}
          <Button size="small" color="inherit" onClick={() => setSelected([])}>Clear</Button>
        </Toolbar>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onRowsPerPageChange={n => { setPageSize(n); setPage(1); }}
        loading={ticketsQ.isLoading}
        emptyText="No tickets match these filters"
        onRowClick={t => navigate(`/tickets/${t.key}`)}
        selection={{
          selected,
          onChange: setSelected,
          isSelectable: t => perms.canBulk,
        }}
      />

      <FilterBuilderDialog
        open={advancedOpen}
        value={advanced}
        sprints={sprintsQ.data || []}
        users={users}
        onClose={() => setAdvancedOpen(false)}
        onApply={f => { setAdvanced(f); setAdvancedOpen(false); }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete tickets"
        message={`Delete ${selected.length} ticket(s)? This cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => { setConfirmDelete(false); bulk.mutate({ keys: selected, action: 'delete' }, { onSettled: () => setSelected([]) }); }}
        onClose={() => setConfirmDelete(false)}
        danger
      />
      {statusMove.dialog}
    </>
  );
}

function BulkAction({ label, options, onPick }: { label: string; options: { id: string; name: string }[]; onPick: (id: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Button size="small" color="inherit" onClick={e => setAnchor(e.currentTarget)}>{label}</Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {options.map(o => (
          <MenuItem key={o.id || 'none'} onClick={() => { setAnchor(null); onPick(o.id); }}>{o.name}</MenuItem>
        ))}
      </Menu>
    </>
  );
}

function ListItemTextish({ name, onDelete }: { name: string; onDelete: () => void }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', pr: 1 }}>
      <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
      <Tooltip title="Delete view">
        <IconButton size="small" aria-label={`Delete view ${name}`} onClick={e => { e.stopPropagation(); onDelete(); }}>
          <Delete fontSize="inherit" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
