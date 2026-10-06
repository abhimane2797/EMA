import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, Chip, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { FileDownload, Lock } from '@mui/icons-material';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import { PageHeader } from '../../../components/PageHeader';
import { downloadCSV, fmtDate } from '../../../utils';
import { PRIORITY_COLORS } from '../constants';
import { BurndownChart } from '../components/BurndownChart';
import { useBurndown, useReports, useSprints } from '../api/queries';
import { useTicketPermissions } from '../permissions';
import { toast } from '../store/toastStore';

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export function TicketReportsPage() {
  const navigate = useNavigate();
  const perms = useTicketPermissions();
  const [from, setFrom] = useState(day(-30));
  const [to, setTo] = useState(day(0));
  const reportsQ = useReports(from, to);
  const sprintsQ = useSprints();
  const activeSprintId = (sprintsQ.data || []).find(s => s.status === 'active')?.id || null;
  const activeSprintBurndown = useBurndown(activeSprintId);

  const data = reportsQ.data;
  const exportCsv = () => {
    if (!data) return;
    downloadCSV(
      data.velocity.map(v => ({ sprint: v.sprint.name, committed: v.committedPoints, completed: v.completedPoints })),
      `sprint-velocity-${from}-${to}.csv`,
    );
    toast('Sprint velocity CSV exported', 'success');
  };

  const workload = useMemo(() => data?.workload || [], [data]);
  const resolution = useMemo(() => data?.resolutionTime || [], [data]);

  if (!perms.canViewReports) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <Lock color="disabled" sx={{ fontSize: 40 }} />
        <Typography variant="h6" mt={1}>Reports are restricted</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Only Project Managers and Operations Managers can view ticket reports.
        </Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/tickets')}>Back to tickets</Button>
      </Paper>
    );
  }

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        subtitle={`${fmtDate(from)} → ${fmtDate(to)} · cycle time, workload, velocity, SLA`}
        breadcrumbs={[{ label: 'Tickets', to: '/tickets' }, { label: 'Reports' }]}
        action={
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="date" label="From" value={from} onChange={e => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label="To" value={to} onChange={e => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
            <Button size="small" startIcon={<FileDownload />} onClick={exportCsv} disabled={!data}>Export</Button>
          </Stack>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <Card sx={{ p: 2, boxShadow: 0, borderLeft: '4px solid #0052CC' }}>
            <Typography variant="caption" color="text.secondary">Created</Typography>
            <Typography variant="h4" fontWeight={800}>{data?.totals.created ?? '—'}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ p: 2, boxShadow: 0, borderLeft: '4px solid #00875A' }}>
            <Typography variant="caption" color="text.secondary">Resolved</Typography>
            <Typography variant="h4" fontWeight={800}>{data?.totals.resolved ?? '—'}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ p: 2, boxShadow: 0, borderLeft: '4px solid #6554C0' }}>
            <Typography variant="caption" color="text.secondary">Avg resolution</Typography>
            <Typography variant="h4" fontWeight={800}>{data ? `${Math.round(data.totals.avgResolutionHours)}h` : '—'}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ p: 2, boxShadow: 0, borderLeft: '4px solid #C9372C' }}>
            <Typography variant="caption" color="text.secondary">Overdue</Typography>
            <Typography variant="h4" fontWeight={800}>{data?.totals.overdue ?? '—'}</Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Average resolution time (hours)</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={resolution} margin={{ top: 4, right: 8, bottom: 4, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip formatter={(v: any) => [`${Math.round(v)}h`, 'Resolution']} />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="#6554C0" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Workload by assignee</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={workload} margin={{ top: 4, right: 8, bottom: 4, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip />
                <Legend />
                <Bar dataKey="open" name="Open tickets" stackId="a" fill="#0052CC" radius={[0, 0, 0, 0]} />
                <Bar dataKey="tickets" name="Total tickets" stackId="b" fill="#8C9BAB" />
                <Bar dataKey="timeSpent" name="Hours logged" fill="#00875A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Sprint velocity (committed vs completed points)</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={(data?.velocity || []).map(v => ({ name: v.sprint.name, committed: v.committedPoints, completed: v.completedPoints }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip />
                <Legend />
                <Bar dataKey="committed" name="Committed" fill="#8C9BAB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#00875A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Active sprint burndown</Typography>
            <BurndownChart points={activeSprintBurndown.data || []} height={240} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Overdue aging (days)</Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={data?.overdueAging || []} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <RTooltip formatter={(v: any) => [`${v} days`, 'Aging']} />
                <Bar dataKey="value" fill="#C9372C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 320, overflow: 'auto' }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>Priority mix</Typography>
            <Stack spacing={1.5} mt={2}>
              {(data?.byAssignee || []).map(r => (
                <Box key={r.name}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.done}/{r.total} done</Typography>
                  </Stack>
                  <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.100', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${r.total ? (r.done / r.total) * 100 : 0}%`, bgcolor: '#00875A' }} />
                  </Box>
                </Box>
              ))}
              {!data?.byAssignee?.length && <Typography variant="body2" color="text.secondary">No data for this range.</Typography>}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              SLA breaches — open longer than the priority target ({(data?.slaBreaches || []).length})
            </Typography>
            {(data?.slaBreaches || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">No SLA breaches in this range. 🎯</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Key</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Hours open</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Assignee</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data!.slaBreaches.map((b, i) => (
                    <TableRow key={`${b.key}-${i}`} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>{b.key}</TableCell>
                      <TableCell>{b.title}</TableCell>
                      <TableCell>
                        <Chip size="small" label={b.priority} sx={{ bgcolor: PRIORITY_COLORS[b.priority], color: '#fff', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="right"><b>{b.hoursOpen}h</b></TableCell>
                      <TableCell>{b.assigneeName || 'Unassigned'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
