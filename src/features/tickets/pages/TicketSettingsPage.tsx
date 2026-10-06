import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Divider, FormControlLabel, Grid, Paper, Stack, TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, Lock, Save } from '@mui/icons-material';
import { PageHeader } from '../../../components/PageHeader';
import { TicketSettings, TicketStatus } from '../types';
import { DEFAULT_SLA_HOURS, STATUS_COLORS, TICKET_STATUSES } from '../constants';
import { useSaveSettings, useTicketSettings } from '../api/queries';
import { useTicketPermissions } from '../permissions';

function ChipEditor({
  label, options, onChange, hint, color = 'default',
}: {
  label: string;
  options: string[];
  onChange: (next: string[]) => void;
  hint?: string;
  color?: any;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v || options.includes(v)) { setDraft(''); return; }
    onChange([...options, v]);
    setDraft('');
  };
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>{label}</Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mb={1}>
        {options.map(o => (
          <Chip
            key={o}
            size="small"
            color={color}
            label={o}
            onDelete={options.length > 1 ? () => onChange(options.filter(x => x !== o)) : undefined}
            sx={{ fontWeight: 600 }}
          />
        ))}
        {!options.length && <Typography variant="caption" color="text.secondary">Empty — add at least one.</Typography>}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={`Add ${label.toLowerCase()}…`}
          inputProps={{ 'aria-label': `Add ${label}` }}
        />
        <Button size="small" startIcon={<Add />} onClick={add} disabled={!draft.trim()}>Add</Button>
      </Stack>
      {hint && <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>{hint}</Typography>}
    </Box>
  );
}

export function TicketSettingsPage() {
  const perms = useTicketPermissions();
  const settingsQ = useTicketSettings();
  const save = useSaveSettings();
  const [form, setForm] = useState<TicketSettings | null>(null);

  useEffect(() => {
    if (settingsQ.data && !form) setForm(JSON.parse(JSON.stringify(settingsQ.data)));
  }, [settingsQ.data, form]);

  if (!perms.canConfigure) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <Lock color="disabled" sx={{ fontSize: 40 }} />
        <Typography variant="h6" mt={1}>Ticket settings are restricted</Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Only the Operations Manager can configure ticket types, workflow and SLAs.
        </Typography>
      </Paper>
    );
  }

  if (!form) return <Paper sx={{ p: 4 }}><Typography color="text.secondary">Loading settings…</Typography></Paper>;

  const set = (patch: Partial<TicketSettings>) => setForm({ ...form, ...patch });

  const toggleWorkflow = (from: TicketStatus, to: TicketStatus) => {
    const current = form.workflow[from] || [];
    const next = current.includes(to) ? current.filter(x => x !== to) : [...current, to];
    set({ workflow: { ...form.workflow, [from]: next } });
  };

  return (
    <>
      <PageHeader
        title="Ticket settings"
        subtitle="Configure key prefix, fields, workflow transitions and SLA targets."
        breadcrumbs={[{ label: 'Tickets', to: '/tickets' }, { label: 'Settings' }]}
        action={
          <Button variant="contained" startIcon={<Save />} disabled={save.isPending} onClick={() => save.mutate(form)}>
            {save.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        }
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Workflow changes apply to every transition control (list, board, detail). A transition to <b>Done</b> always needs a resolution.
      </Alert>

      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Ticket key prefix"
              value={form.keyPrefix}
              onChange={e => set({ keyPrefix: e.target.value.toUpperCase().slice(0, 6) })}
              helperText="Keys look like EMA-131 — the counter is shared."
              inputProps={{ 'aria-label': 'Ticket key prefix' }}
            />
          </Grid>
          <Grid item xs={12} md={9}>
            <Alert severity="warning" sx={{ mt: { md: 1 } }}>
              Changing the prefix only affects <b>new</b> tickets. Existing keys are never renumbered.
            </Alert>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h6" fontSize={16} fontWeight={700} mb={2}>Ticket types</Typography>
            <ChipEditor label="Types" options={form.types} onChange={v => set({ types: v as TicketSettings['types'] })} hint="Shown in the create form and board type icons." />
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" fontSize={16} fontWeight={700} mb={2}>Priorities</Typography>
            <ChipEditor label="Priorities" options={form.priorities} onChange={v => set({ priorities: v as TicketSettings['priorities'] })} hint="Order matters — highest first." />
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" fontSize={16} fontWeight={700} mb={2}>Severities</Typography>
            <ChipEditor label="Severities" options={form.severities} onChange={v => set({ severities: v as TicketSettings['severities'] })} />
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" fontSize={16} fontWeight={700} mb={2}>Resolutions</Typography>
            <ChipEditor label="Resolutions" options={form.resolutions} onChange={v => set({ resolutions: v as TicketSettings['resolutions'] })} hint="Required when a ticket moves to Done." />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h6" fontSize={16} fontWeight={700} mb={2}>Labels</Typography>
            <ChipEditor label="Labels" options={form.labels} onChange={v => set({ labels: v })} />
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" fontSize={16} fontWeight={700} mb={2}>Components</Typography>
            <ChipEditor label="Components" options={form.components} onChange={v => set({ components: v })} />
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" fontSize={16} fontWeight={700} mb={1}>SLA targets (hours to first response)</Typography>
            <Grid container spacing={1.5}>
              {(Object.keys(form.slaHours) as (keyof typeof DEFAULT_SLA_HOURS)[]).map(p => (
                <Grid item xs={6} sm={4} key={p}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    label={p}
                    value={form.slaHours[p]}
                    onChange={e => set({ slaHours: { ...form.slaHours, [p]: Number(e.target.value) } })}
                    inputProps={{ min: 1, 'aria-label': `SLA hours for ${p}` }}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" fontSize={16} fontWeight={700} mb={0.5}>Workflow transitions</Typography>
            <Typography variant="caption" color="text.secondary" mb={2} display="block">
              Tick every status a ticket may move to from the row status. Done only offers Reopened by design.
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="tbody">
                  <Box component="tr">
                    <Box component="th" sx={{ textAlign: 'left', p: 1, fontSize: 12, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider', width: 130 }}>
                      From ↓ / To →
                    </Box>
                    {TICKET_STATUSES.map(s => (
                      <Box key={s} component="th" sx={{ p: 1, fontSize: 11, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS[s] }} />
                          {s}
                        </Stack>
                      </Box>
                    ))}
                  </Box>
                  {TICKET_STATUSES.map(from => (
                    <Box component="tr" key={from}>
                      <Box component="td" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_COLORS[from] }} />
                          <Typography variant="body2" fontWeight={600}>{from}</Typography>
                        </Stack>
                      </Box>
                      {TICKET_STATUSES.map(to => {
                        const checked = (form.workflow[from] || []).includes(to);
                        const self = from === to;
                        return (
                          <Box key={to} component="td" sx={{ p: 0, textAlign: 'center', borderBottom: '1px solid', borderColor: 'divider', opacity: self ? 0.3 : 1 }}>
                            <Checkbox
                              size="small"
                              checked={checked}
                              disabled={self || (from === 'Done' && to !== 'Reopened')}
                              onChange={() => toggleWorkflow(from, to)}
                              inputProps={{ 'aria-label': `${from} to ${to}` }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>

            <Stack direction="row" spacing={2} mt={2}>
              <FormControlLabel control={<Checkbox size="small" checked disabled />} label={<Typography variant="caption">Done → Reopened is locked (the only exit from Done)</Typography>} />
              <Box flex={1} />
              <Button variant="contained" startIcon={<Save />} disabled={save.isPending} onClick={() => save.mutate(form)}>
                Save settings
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
