import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, Chip, Grid, List, ListItemButton, ListItemText, MenuItem, Paper, Stack,
  TextField, Typography,
} from '@mui/material';
import { Add, OpenInNew } from '@mui/icons-material';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import { PageHeader } from '../../../components/PageHeader';
import { Ticket } from '../types';
import { PRIORITY_COLORS, STATUS_COLORS, TICKET_PRIORITIES, TICKET_STATUSES, isOverdue } from '../constants';
import { TicketStatusChip } from '../components/TicketStatusChip';
import { PriorityIcon } from '../components/TicketStatusChip';
import { TypeIcon } from '../components/TypeIcon';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import { useDashboard, useTickets } from '../api/queries';
import { useTicketPermissions } from '../permissions';
import { useTicketHotkeys } from '../hooks/useTicketHotkeys';

function StatCard({ label, value, hint, color, onClick }: { label: string; value: number | string; hint?: string; color: string; onClick?: () => void }) {
  return (
    <Card
      sx={{
        p: 2, borderLeft: `4px solid ${color}`, cursor: onClick ? 'pointer' : 'default',
        bgcolor: 'background.paper', boxShadow: 0, '&:hover': onClick ? { boxShadow: 2 } : {},
      }}
      onClick={onClick}
    >
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Card>
  );
}

function TicketRows({ tickets, onPreview, onOpen }: { tickets: Ticket[]; onPreview: (k: string) => void; onOpen: (k: string) => void }) {
  if (!tickets.length) {
    return <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Nothing to show right now.</Typography>;
  }
  return (
    <List dense disablePadding>
      {tickets.slice(0, 8).map(t => (
        <ListItemButton key={t.key} onClick={() => onPreview(t.key)} divider sx={{ alignItems: 'flex-start' }}>
          <TypeIcon type={t.type} size={15} />
          <Box sx={{ mx: 1, flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>{t.key}</Typography>
              <TicketStatusChip status={t.status} />
              {isOverdue(t.dueDate, t.status) && <Chip size="small" color="error" label="Overdue" sx={{ height: 18, fontSize: 10 }} />}
            </Stack>
            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</Typography>
            <Typography variant="caption" color="text.secondary">{t.assigneeName || 'Unassigned'}</Typography>
          </Box>
          <PriorityIcon priority={t.priority} size={14} />
        </ListItemButton>
      ))}
    </List>
  );
}

export function TicketsDashboard() {
  const navigate = useNavigate();
  const perms = useTicketPermissions();
  const dashQ = useDashboard();
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [preview, setPreview] = useState<string | null>(null);

  useTicketHotkeys({ onCreate: () => navigate('/tickets/new') });

  const mineQ = useTickets({ onlyMine: perms.user?.id, pageSize: 8, sortBy: 'updatedAt', sortDir: 'desc' }, { enabled: !!perms.user });
  const recentQ = useTickets({ pageSize: 8, sortBy: 'updatedAt', sortDir: 'desc' });

  const dash = dashQ.data;
  const trend = useMemo(() => {
    const d = dash?.trend || [];
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return d.slice(-days);
  }, [dash, range]);

  const openTicket = (k: string) => navigate(`/tickets/${k}`);

  return (
    <>
      <PageHeader
        title="Ticket dashboard"
        subtitle="Live roll-up of the ticket backlog, workload and delivery trend."
        breadcrumbs={[{ label: 'Tickets', to: '/tickets' }, { label: 'Dashboard' }]}
        action={
          <Stack direction="row" spacing={1}>
            <TextField select size="small" value={range} onChange={e => setRange(e.target.value as any)} sx={{ minWidth: 120 }} inputProps={{ 'aria-label': 'Trend range' }}>
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
            </TextField>
            <Button size="small" variant="outlined" startIcon={<OpenInNew />} onClick={() => navigate('/tickets/board')}>Board</Button>
            <Button size="small" variant="contained" startIcon={<Add />} onClick={() => navigate('/tickets/new')}>New ticket</Button>
          </Stack>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={6} sm={4} lg={2}>
          <StatCard label="Open tickets" value={dash?.open ?? '—'} hint="not Done" color="#0052CC" onClick={() => navigate('/tickets/list')} />
        </Grid>
        <Grid item xs={6} sm={4} lg={2}>
          <StatCard label="In progress" value={dash?.inProgress ?? '—'} hint="active work" color="#6554C0" onClick={() => navigate('/tickets/board')} />
        </Grid>
        <Grid item xs={6} sm={4} lg={2}>
          <StatCard label="Overdue" value={dash?.overdue ?? '—'} hint="past due date" color="#C9372C" onClick={() => navigate('/tickets/list?overdue=true')} />
        </Grid>
        <Grid item xs={6} sm={4} lg={2}>
          <StatCard label="Unassigned" value={dash?.unassigned ?? '—'} hint="needs an owner" color="#B65C00" onClick={() => navigate('/tickets/list')} />
        </Grid>
        <Grid item xs={6} sm={4} lg={2}>
          <StatCard label="Resolved this week" value={dash?.resolvedThisWeek ?? '—'} hint="closed in 7 days" color="#00875A" onClick={() => navigate('/tickets/reports')} />
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Tickets by status</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie data={dash?.byStatus || []} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2}>
                  {(dash?.byStatus || []).map(s => <Cell key={s.name} fill={STATUS_COLORS[s.name as keyof typeof STATUS_COLORS]} />)}
                </Pie>
                <RTooltip formatter={(v: any, n: any) => [v, n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Tickets by priority</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={dash?.byPriority || []} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip />
                <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]}>
                  {(dash?.byPriority || []).map(p => (
                    <Cell key={p.name} fill={PRIORITY_COLORS[p.name as keyof typeof PRIORITY_COLORS] || '#5E6C84'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography variant="subtitle2" color="text.secondary">Created vs resolved</Typography>
              <Box flex={1} />
              <Typography variant="caption" color="text.secondary">{range.toUpperCase()} window</Typography>
            </Stack>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => String(d).slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#0052CC" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolved" stroke="#00875A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>Assigned to me</Typography>
              <Chip size="small" label={mineQ.data?.total ?? 0} />
              <Box flex={1} />
              <Button size="small" onClick={() => navigate('/tickets/list?onlyMine=true')}>See all</Button>
            </Stack>
            <TicketRows tickets={mineQ.data?.data || []} onPreview={setPreview} onOpen={openTicket} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <Typography variant="subtitle2" fontWeight={700}>Recently updated</Typography>
              <Box flex={1} />
              <Button size="small" onClick={() => navigate('/tickets/list')}>See all</Button>
            </Stack>
            <TicketRows tickets={recentQ.data?.data || []} onPreview={setPreview} onOpen={openTicket} />
          </Paper>
        </Grid>
      </Grid>

      <TicketDetailDrawer
        ticketKey={preview}
        open={!!preview}
        onClose={() => setPreview(null)}
        onOpenFull={k => { setPreview(null); openTicket(k); }}
      />
    </>
  );
}
