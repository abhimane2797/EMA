import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { Add, DashboardOutlined, ViewKanban } from '@mui/icons-material';
import { PageHeader } from '../../../components/PageHeader';
import { emptyTicketFilters, TicketFilterState, TicketStatus } from '../types';
import { filterStateToParams } from '../constants';
import { TicketBoard, BoardLane, LANE_LABEL } from '../components/TicketBoard';
import { TicketFilterBar } from '../components/TicketFilterBar';
import { useCreateTicket, useSprints, useTickets, useTicketSettings, useTicketUsers } from '../api/queries';
import { useTicketPermissions } from '../permissions';
import { useStatusMove } from '../hooks/useStatusMove';
import { useTicketHotkeys } from '../hooks/useTicketHotkeys';

export function TicketBoardPage() {
  const navigate = useNavigate();
  const perms = useTicketPermissions();
  const [filters, setFilters] = useState<TicketFilterState>(emptyTicketFilters);
  const [lane, setLane] = useState<BoardLane>('none');

  const usersQ = useTicketUsers();
  const sprintsQ = useSprints();
  const settingsQ = useTicketSettings();
  const create = useCreateTicket();
  const statusMove = useStatusMove();

  const users = (usersQ.data || []).map(u => ({ id: u.id, name: u.employeeName }));

  const params = useMemo(() => ({
    ...filterStateToParams(filters),
    onlyMine: filters.onlyMine ? perms.user?.id : undefined,
    pageSize: 300,
    sortBy: 'priority',
    sortDir: 'asc' as const,
  }), [filters, perms.user?.id]);

  const ticketsQ = useTickets(params);
  const tickets = ticketsQ.data?.data || [];

  useTicketHotkeys({ onCreate: () => navigate('/tickets/new') });

  const openTicket = (key: string) => navigate(`/tickets/${key}`);

  return (
    <>
      <PageHeader
        title="Board"
        subtitle={`${tickets.length} ticket${tickets.length === 1 ? '' : 's'} on the board · press C to create, / to search, arrow keys to move a focused card`}
        breadcrumbs={[{ label: 'Tickets', to: '/tickets' }, { label: 'Board' }]}
        action={
          <Stack direction="row" spacing={1}>
            <Tooltip title="Kanban board"><ViewKanban color="primary" /></Tooltip>
            <Button size="small" variant="outlined" startIcon={<DashboardOutlined />} onClick={() => navigate('/tickets/dashboard')}>
              Dashboard
            </Button>
            <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/tickets/new')}>
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
        showOnlyMine
        rightSlot={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">Swimlanes</Typography>
            <TextField
              select
              size="small"
              value={lane}
              onChange={e => setLane(e.target.value as BoardLane)}
              sx={{ minWidth: 160 }}
              inputProps={{ 'aria-label': 'Swimlanes' }}
            >
              {(Object.keys(LANE_LABEL) as BoardLane[]).map(l => (
                <MenuItem key={l} value={l}>{LANE_LABEL[l]}</MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      />

      <TicketBoard
        tickets={tickets}
        lane={lane}
        loading={ticketsQ.isLoading}
        onOpen={openTicket}
        onMove={(key, status) => statusMove.move(key, status)}
        canMove={t => perms.canChangeStatus(t)}
        canCreate={perms.canCreate}
        onQuickCreate={({ title, status }: { title: string; status: TicketStatus }) => {
          create.mutate({
            title,
            description: '',
            type: 'Task',
            priority: 'Medium',
            status,
            projectId: 'proj-1',
            reporterId: perms.user?.id,
            assigneeId: perms.user?.id || null,
          });
        }}
      />
      {statusMove.dialog}
    </>
  );
}
