import { addDays, format, subDays } from 'date-fns';
import { ActivityEntry, Sprint, Ticket, TicketComment, TicketNotification, TicketSettings, WorkLog } from '../types';
import { defaultTicketSettings } from '../constants';

const now = new Date();
export const day = (offset: number) => format(addDays(now, offset), 'yyyy-MM-dd');
const at = (daysAgo: number, hour = 10, minute = 15) => {
  const d = subDays(now, daysAgo);
  d.setHours(hour, minute, (daysAgo * 13) % 60, 0);
  return d.toISOString();
};

const NAMES: Record<string, string> = {
  'u-1': 'Rishikesh Oza', 'u-2': 'Tanmay Halaye', 'u-3': 'Pratik Mulgir', 'u-4': 'Gaurav Bhangale',
  'u-5': 'Ananya Singh', 'u-6': 'Vikas Patil', 'u-7': 'Sneha Kulkarni', 'u-8': 'Rajesh Sharma',
};

export const seedSprints: Sprint[] = [
  { id: 'sp-24', name: 'FSL Sprint 24', goal: 'Evidence intake portal hardening + LIMS patch rollout', startDate: day(-24), endDate: day(-10), status: 'completed', projectId: 'proj-1', completedAt: at(10, 17, 45) },
  { id: 'sp-25', name: 'FSL Sprint 25', goal: 'Role based access, ticket workflow and reporting for FSL go-live', startDate: day(-4), endDate: day(10), status: 'active', projectId: 'proj-1', completedAt: null },
];

type Seed = {
  n: number; title: string; description: string;
  type: Ticket['type']; priority: Ticket['priority']; severity: Ticket['severity']; status: Ticket['status'];
  resolution?: Ticket['resolution'];
  reporter: string; assignee?: string | null;
  sprint?: string | null;
  labels?: string[]; components?: string[];
  createdDaysAgo: number; updatedDaysAgo: number;
  dueIn?: number | null; startDaysAgo?: number | null;
  estimate?: number; spent?: number; remaining?: number; points?: number;
  linkedTaskId?: string | null; watchers?: string[];
  subtasks?: { title: string; done: boolean }[];
};

const B = (title: string, body: string, ..._rest: any[]): string => body;

const seeds: Seed[] = [
  // ------------------------------------------------- Sprint 24 (completed)
  { n: 101, title: 'Login fails for users with expired password after 90 days', description: B('', `### Expected\nUser with a password older than 90 days must be redirected to the **change password** screen.\n\n### Actual\nUser is bounced back to login with a generic error.\n\n1. Login with \`ananya.singh\`\n2. Observe redirect loop\n3. Console shows 401 with no body`), type: 'Bug', priority: 'Highest', severity: 'Blocker', status: 'Done', resolution: 'Done', reporter: 'u-4', assignee: 'u-5', sprint: 'sp-24', labels: ['security', 'backend'], components: ['Auth Service'], createdDaysAgo: 26, updatedDaysAgo: 12, dueIn: -18, startDaysAgo: 25, estimate: 8, spent: 7.5, remaining: 0, points: 5, linkedTaskId: 'TSK-0003', watchers: ['u-3'] },
  { n: 102, title: 'Evidence chain-of-custody audit log is missing actor IP', description: B('', `Audit entries record the actor but not the source IP.\n\n- Table: \`audit_log\`\n- Column to add: \`actor_ip\`\n- Backfill for last 6 months`), type: 'Improvement', priority: 'High', severity: 'Major', status: 'Done', resolution: "Won't Fix", reporter: 'u-3', assignee: 'u-4', sprint: 'sp-24', labels: ['compliance', 'data-migration'], components: ['Database'], createdDaysAgo: 25, updatedDaysAgo: 11, dueIn: -12, startDaysAgo: 24, estimate: 12, spent: 10, remaining: 0, points: 8, watchers: ['u-1'] },
  { n: 103, title: 'Dashboard KPI cards overlap on 1366px screens', description: B('', `Grid collapses badly between 1280–1440px.\n\nUse \`sm={6} md={3}\` and add \`minHeight\` to cards.`), type: 'Bug', priority: 'Medium', severity: 'Minor', status: 'Done', resolution: 'Done', reporter: 'u-7', assignee: 'u-4', sprint: 'sp-24', labels: ['ui-ux', 'frontend'], components: ['Web Portal'], createdDaysAgo: 23, updatedDaysAgo: 13, dueIn: -13, startDaysAgo: 22, estimate: 4, spent: 3, remaining: 0, points: 3 },
  { n: 104, title: 'Bulk import of 12,000 evidence records times out', description: B('', `Import job times out after 30s at nginx layer.\n\n- Chunk the upload into 500-row batches\n- Add progress reporting`), type: 'Bug', priority: 'High', severity: 'Critical', status: 'Done', resolution: 'Done', reporter: 'u-3', assignee: 'u-5', sprint: 'sp-24', labels: ['performance', 'data-migration'], components: ['API Gateway', 'Database'], createdDaysAgo: 22, updatedDaysAgo: 14, dueIn: -11, startDaysAgo: 21, estimate: 16, spent: 18, remaining: 0, points: 13, linkedTaskId: 'CTSK-0002' },
  { n: 105, title: 'Add ₹ currency formatting to budget summary', description: B('', `Budget totals render as raw numbers. Use \`toLocaleString('en-IN')\`.`), type: 'Task', priority: 'Low', severity: 'Minor', status: 'Done', resolution: 'Done', reporter: 'u-3', assignee: 'u-4', sprint: 'sp-24', labels: ['frontend'], components: ['Web Portal'], createdDaysAgo: 21, updatedDaysAgo: 12, dueIn: -14, startDaysAgo: 20, estimate: 2, spent: 2, remaining: 0, points: 2 },
  { n: 106, title: 'Printer mapping for Pune FSL label printer not persisting', description: B('', `Zebra ZD421 mapping resets after each deploy.\n\nPersist printer profile in \`settings.printers\` instead of localStorage.`), type: 'Bug', priority: 'Medium', severity: 'Major', status: 'Done', resolution: 'Cannot Reproduce', reporter: 'u-7', assignee: 'u-6', sprint: 'sp-24', labels: ['infra'], components: ['Reporting'], createdDaysAgo: 20, updatedDaysAgo: 15, dueIn: -15, startDaysAgo: 19, estimate: 6, spent: 4, remaining: 0, points: 3 },
  { n: 107, title: 'Write API contract for evidence search endpoint', description: B('', 'OpenAPI 3.0 spec, request/response examples, error codes.', 'x'), type: 'Task', priority: 'Medium', severity: 'Minor', status: 'Reopened', reporter: 'u-3', assignee: 'u-4', sprint: 'sp-24', labels: ['backend', 'compliance'], components: ['API Gateway'], createdDaysAgo: 19, updatedDaysAgo: 3, dueIn: -3, startDaysAgo: 18, estimate: 6, spent: 5, remaining: 2, points: 5 },
  { n: 108, title: 'Two-factor enrolment screen has no accessible labels', description: B('', `Screen reader announces "button" for all actions.\n\n- Add \`aria-label\`\n- Contrast of helper text below 4.5:1`), type: 'Improvement', priority: 'High', severity: 'Major', status: 'Done', resolution: 'Done', reporter: 'u-7', assignee: 'u-5', sprint: 'sp-24', labels: ['ui-ux', 'compliance'], components: ['Auth Service'], createdDaysAgo: 18, updatedDaysAgo: 11, dueIn: -11, startDaysAgo: 17, estimate: 5, spent: 5.5, remaining: 0, points: 3 },
  { n: 109, title: 'Nightly backup job not running on Sundays', description: B('', 'Cron entry was lost during the server migration. Restore and verify.', 'x'), type: 'Incident', priority: 'Highest', severity: 'Blocker', status: 'Done', resolution: 'Done', reporter: 'u-1', assignee: 'u-6', sprint: 'sp-24', labels: ['infra'], components: ['Database'], createdDaysAgo: 17, updatedDaysAgo: 10, dueIn: -10, startDaysAgo: 17, estimate: 3, spent: 3, remaining: 0, points: 2, watchers: ['u-2'] },
  { n: 110, title: 'Search highlighting breaks on unicode case names', description: B('', 'Evidence titles with Devanagari characters lose highlighting.', 'x'), type: 'Bug', priority: 'Low', severity: 'Trivial', status: 'Done', resolution: 'Duplicate', reporter: 'u-4', assignee: 'u-4', sprint: 'sp-24', labels: ['frontend'], components: ['Web Portal'], createdDaysAgo: 16, updatedDaysAgo: 12, dueIn: -12, startDaysAgo: 15, estimate: 2, spent: 1, remaining: 0, points: 1 },

  // ------------------------------------------------- Sprint 25 (active)
  { n: 111, title: 'Role based access matrix does not persist toggles after refresh', description: B('', `### Steps\n1. Admin → Roles & Access → toggle a module to **No**\n2. Refresh the browser\n3. Toggle reverts\n\n**Root cause:** user object in \`localStorage\` is stale.\n\nFix: re-read the user from the API on hydrate.`, ''), type: 'Bug', priority: 'Highest', severity: 'Critical', status: 'In Progress', reporter: 'u-1', assignee: 'u-4', sprint: 'sp-25', labels: ['security', 'backend'], components: ['Auth Service', 'Web Portal'], createdDaysAgo: 9, updatedDaysAgo: 0, dueIn: 1, startDaysAgo: 4, estimate: 12, spent: 6.5, remaining: 5.5, points: 8, linkedTaskId: 'TSK-0001', watchers: ['u-3', 'u-1'] },
  { n: 112, title: 'Ticket workflow editor: allow disabling a transition', description: B('', 'Admin must be able to untick an allowed transition and have the board honour it.', 'x'), type: 'Story', priority: 'High', severity: 'Major', status: 'In Review', reporter: 'u-3', assignee: 'u-7', sprint: 'sp-25', labels: ['compliance'], components: ['Web Portal'], createdDaysAgo: 8, updatedDaysAgo: 1, dueIn: 3, startDaysAgo: 4, estimate: 10, spent: 9, remaining: 1, points: 8, subtasks: [{ title: 'Transition table UI', done: true }, { title: 'Persist to settings API', done: true }, { title: 'Unit tests for canTransition', done: false }] },
  { n: 113, title: 'SLA breach notification fires twice for the same ticket', description: B('', 'Two watchers with the same user id after a re-login. De-duplicate by \`userId + ticketKey\`.', 'x'), type: 'Bug', priority: 'High', severity: 'Major', status: 'Testing', reporter: 'u-3', assignee: 'u-7', sprint: 'sp-25', labels: ['backend'], components: ['Reporting'], createdDaysAgo: 7, updatedDaysAgo: 1, dueIn: 2, startDaysAgo: 4, estimate: 4, spent: 4, remaining: 0, points: 3 },
  { n: 114, title: 'Wire the new evidence QR scanner to the intake form', description: B('', 'Scanner outputs a 22 char ULID. Map it to the evidence number field and validate checksum.', 'x'), type: 'Task', priority: 'Medium', severity: 'Minor', status: 'In Progress', reporter: 'u-3', assignee: 'u-5', sprint: 'sp-25', labels: ['frontend', 'lms'], components: ['LIMS', 'Web Portal'], createdDaysAgo: 6, updatedDaysAgo: 0, dueIn: 5, startDaysAgo: 4, estimate: 14, spent: 6, remaining: 8, points: 8, linkedTaskId: 'CTSK-0003' },
  { n: 115, title: 'Nagpur FSL VPN drops every 4 hours during large transfers', description: B('', `### Impact\nEvidence uploads from Nagpur fail mid-transfer.\n\n### Notes\n- MPLS handover at 4h mark\n- Vendor ticket \`MPLS-88214\` raised`, ''), type: 'Incident', priority: 'Highest', severity: 'Blocker', status: 'Blocked', reporter: 'u-5', assignee: 'u-5', sprint: 'sp-25', labels: ['network', 'infra'], components: ['Network'], createdDaysAgo: 5, updatedDaysAgo: 1, dueIn: -1, startDaysAgo: 5, estimate: 8, spent: 3, remaining: 8, points: 5, watchers: ['u-1', 'u-3'], linkedTaskId: 'TSK-0006' },
  { n: 116, title: 'Export tickets to CSV includes soft-deleted rows', description: B('', 'Add \`deletedAt IS NULL\` to the export query.', 'x'), type: 'Bug', priority: 'Medium', severity: 'Minor', status: 'To Do', reporter: 'u-4', assignee: 'u-4', sprint: 'sp-25', labels: ['backend'], components: ['Reporting'], createdDaysAgo: 5, updatedDaysAgo: 2, dueIn: 4, startDaysAgo: 3, estimate: 3, spent: 0, remaining: 3, points: 2 },
  { n: 117, title: 'Dark mode: board column headers are unreadable', description: B('', 'Column header text uses a fixed `#111827`. Switch to `text.primary`.', 'x'), type: 'Bug', priority: 'Medium', severity: 'Minor', status: 'To Do', reporter: 'u-7', assignee: 'u-4', sprint: 'sp-25', labels: ['ui-ux', 'frontend'], components: ['Web Portal'], createdDaysAgo: 4, updatedDaysAgo: 1, dueIn: 6, startDaysAgo: null, estimate: 2, spent: 0, remaining: 2, points: 1 },
  { n: 118, title: 'Add "Move to sprint" action on the ticket card', description: B('', 'Keyboard accessible alternative to drag and drop.', 'x'), type: 'Story', priority: 'Low', severity: 'Trivial', status: 'In Progress', reporter: 'u-3', assignee: 'u-4', sprint: 'sp-25', labels: ['ui-ux'], components: ['Web Portal'], createdDaysAgo: 4, updatedDaysAgo: 0, dueIn: 7, startDaysAgo: 2, estimate: 5, spent: 2, remaining: 3, points: 3 },
  { n: 119, title: 'Forensic report PDF drops the signature block', description: B('', 'Puppeteer print margins cut the last 40px. Set `printBackground: true` and A4 margins.', 'x'), type: 'Bug', priority: 'High', severity: 'Major', status: 'In Review', reporter: 'u-7', assignee: 'u-5', sprint: 'sp-25', labels: ['compliance', 'backend'], components: ['Reporting'], createdDaysAgo: 6, updatedDaysAgo: 1, dueIn: 2, startDaysAgo: 3, estimate: 7, spent: 6.5, remaining: 0.5, points: 5 },
  { n: 120, title: 'Rate limit the evidence search API (60 rpm per user)', description: B('', 'Redis based fixed window counter, 429 with `Retry-After`.', 'x'), type: 'Improvement', priority: 'High', severity: 'Major', status: 'In Progress', reporter: 'u-1', assignee: 'u-4', sprint: 'sp-25', labels: ['security', 'performance'], components: ['API Gateway'], createdDaysAgo: 4, updatedDaysAgo: 0, dueIn: 3, startDaysAgo: 3, estimate: 8, spent: 3, remaining: 5, points: 5, watchers: ['u-3'] },
  { n: 121, title: 'Onboard 3 new QA users and retire 2 leavers', description: B('', 'Accounts must be created with role *Technical Team Member* and project *Computerization of FSL*.', 'x'), type: 'Task', priority: 'Medium', severity: 'Minor', status: 'Testing', reporter: 'u-2', assignee: 'u-7', sprint: 'sp-25', labels: ['compliance'], components: ['Auth Service'], createdDaysAgo: 3, updatedDaysAgo: 1, dueIn: 1, startDaysAgo: 3, estimate: 2, spent: 2, remaining: 0, points: 2 },
  { n: 122, title: 'Mobile: ticket table does not collapse into cards below 640px', description: B('', "Render stacked cards with key/title/status when `useMediaQuery('(max-width:640px)')`."), type: 'Improvement', priority: 'Medium', severity: 'Minor', status: 'To Do', reporter: 'u-4', assignee: 'u-4', sprint: 'sp-25', labels: ['ui-ux', 'frontend'], components: ['Web Portal'], createdDaysAgo: 3, updatedDaysAgo: 2, dueIn: 8, startDaysAgo: null, estimate: 6, spent: 0, remaining: 6, points: 5 },

  // ------------------------------------------------- Backlog
  { n: 123, title: 'Offline mode for field evidence collection', description: B('', 'Service worker caching of the intake form + background sync when the site reconnects.', 'x'), type: 'Story', priority: 'High', severity: 'Major', status: 'Backlog', reporter: 'u-1', assignee: null, sprint: null, labels: ['frontend', 'lms'], components: ['LIMS'], createdDaysAgo: 30, updatedDaysAgo: 8, dueIn: null, startDaysAgo: null, estimate: 40, spent: 0, remaining: 40, points: 13 },
  { n: 124, title: 'Migrate audit trail to append-only partitioned table', description: B('', 'Partition by month, retain 7 years for compliance.', 'x'), type: 'Improvement', priority: 'Medium', severity: 'Major', status: 'Backlog', reporter: 'u-3', assignee: null, sprint: null, labels: ['data-migration', 'compliance'], components: ['Database'], createdDaysAgo: 28, updatedDaysAgo: 14, dueIn: null, startDaysAgo: null, estimate: 24, spent: 0, remaining: 24, points: 13, linkedTaskId: 'TSK-0003' },
  { n: 125, title: 'Dashboards: add "tickets by component" widget', description: B('', 'Stacked bar per component across statuses.', 'x'), type: 'Story', priority: 'Low', severity: 'Trivial', status: 'Backlog', reporter: 'u-7', assignee: null, sprint: null, labels: ['ui-ux'], components: ['Reporting'], createdDaysAgo: 26, updatedDaysAgo: 20, dueIn: null, startDaysAgo: null, estimate: 8, spent: 0, remaining: 8, points: 5 },
  { n: 126, title: 'Auto-assign tickets to the on-call rota', description: B('', 'Round-robin over the on-call list, skip inactive users.', 'x'), type: 'Improvement', priority: 'Medium', severity: 'Minor', status: 'Backlog', reporter: 'u-1', assignee: null, sprint: null, labels: ['backend'], components: ['API Gateway'], createdDaysAgo: 24, updatedDaysAgo: 16, dueIn: null, startDaysAgo: null, estimate: 10, spent: 0, remaining: 10, points: 8 },
  { n: 127, title: 'Show original estimate vs spent on the board card', description: B('', 'Small progress bar under the title.', 'x'), type: 'Task', priority: 'Low', severity: 'Trivial', status: 'Backlog', reporter: 'u-4', assignee: null, sprint: null, labels: ['frontend', 'ui-ux'], components: ['Web Portal'], createdDaysAgo: 20, updatedDaysAgo: 18, dueIn: null, startDaysAgo: null, estimate: 3, spent: 0, remaining: 3, points: 2 },
  { n: 128, title: 'SAML SSO with the Maharashtra e-Governance IdP', description: B('', 'Metadata exchange, signed assertions, JIT provisioning.', 'x'), type: 'Story', priority: 'Highest', severity: 'Critical', status: 'Backlog', reporter: 'u-1', assignee: null, sprint: null, labels: ['security'], components: ['Auth Service'], createdDaysAgo: 18, updatedDaysAgo: 6, dueIn: null, startDaysAgo: null, estimate: 60, spent: 0, remaining: 60, points: 21, watchers: ['u-3'] },
  { n: 129, title: 'Duplicate case numbers possible after year rollover', description: B('', 'Sequence resets when the year prefix changes. Add a composite unique index.', 'x'), type: 'Bug', priority: 'High', severity: 'Critical', status: 'To Do', reporter: 'u-7', assignee: 'u-5', sprint: null, labels: ['backend', 'data-migration'], components: ['Database', 'LIMS'], createdDaysAgo: 12, updatedDaysAgo: 4, dueIn: -2, startDaysAgo: 8, estimate: 6, spent: 1, remaining: 5, points: 5, watchers: ['u-3'] },
  { n: 130, title: 'Weekly SLA digest email to the Operations Manager', description: B('', 'Breaches, ageing tickets and workload — every Monday 07:00 IST.', 'x'), type: 'Task', priority: 'Medium', severity: 'Minor', status: 'Backlog', reporter: 'u-3', assignee: null, sprint: null, labels: ['compliance', 'backend'], components: ['Reporting'], createdDaysAgo: 10, updatedDaysAgo: 9, dueIn: null, startDaysAgo: null, estimate: 8, spent: 0, remaining: 8, points: 5 },
];

// ---------------------------------------------------------------- factory
function makeTicket(s: Seed): Ticket {
  const createdAt = at(s.createdDaysAgo, 9, 30);
  const updatedAt = at(s.updatedDaysAgo, 16, 10);
  const statusTrail: Ticket['status'][] =
    s.status === 'Backlog' ? ['Backlog']
      : s.status === 'To Do' ? ['Backlog', 'To Do']
      : s.status === 'In Progress' ? ['Backlog', 'To Do', 'In Progress']
      : s.status === 'In Review' ? ['Backlog', 'To Do', 'In Progress', 'In Review']
      : s.status === 'Testing' ? ['Backlog', 'To Do', 'In Progress', 'In Review', 'Testing']
      : s.status === 'Done' ? ['Backlog', 'To Do', 'In Progress', 'In Review', 'Testing', 'Done']
      : s.status === 'Reopened' ? ['Backlog', 'To Do', 'In Progress', 'In Review', 'Testing', 'Done', 'Reopened']
      : ['Backlog', 'To Do', 'In Progress', 'Blocked'];

  const resolvedAt = s.status === 'Done' ? updatedAt : null;
  return {
    id: `EMA-${s.n}`,
    key: `EMA-${s.n}`,
    title: s.title,
    description: s.description,
    type: s.type,
    priority: s.priority,
    severity: s.severity,
    status: s.status,
    resolution: s.resolution ?? null,
    reporterId: s.reporter,
    reporterName: NAMES[s.reporter] || 'Unknown',
    assigneeId: s.assignee ?? null,
    assigneeName: s.assignee ? (NAMES[s.assignee] || null) : null,
    projectId: 'proj-1',
    projectName: 'Computerization of FSL',
    sprintId: s.sprint ?? null,
    labels: s.labels ?? [],
    components: s.components ?? [],
    dueDate: s.dueIn === undefined || s.dueIn === null ? null : day(s.dueIn),
    startDate: s.startDaysAgo === undefined || s.startDaysAgo === null ? null : day(-s.startDaysAgo),
    originalEstimate: s.estimate ?? null,
    timeSpent: s.spent ?? 0,
    remainingEstimate: s.remaining ?? null,
    storyPoints: s.points ?? null,
    linkedTaskId: s.linkedTaskId ?? null,
    links: [],
    watchers: s.watchers ?? [],
    subtasks: (s.subtasks ?? []).map((t, i) => ({ id: `st-${s.n}-${i}`, title: t.title, done: t.done })),
    attachments: [],
    rank: s.n * 10,
    resolvedAt: resolvedAt,
    createdAt,
    updatedAt,
    _trail: statusTrail,
  } as Ticket & { _trail: Ticket['status'][] };
}

export const seedTickets: Ticket[] = seeds.map(makeTicket);

// ---------------------------------------------------------------- activity
function buildActivity(tickets: Ticket[]): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  tickets.forEach((t) => {
    const trail = ((t as any)._trail || ['Backlog']) as Ticket['status'][];
    const start = new Date(t.createdAt).getTime();
    const end = new Date(t.updatedAt).getTime();
    const span = Math.max(end - start, 3600_000);
    out.push({
      id: `act-${t.key}-0`, ticketKey: t.key, authorId: t.reporterId, authorName: t.reporterName,
      kind: 'created', text: `${t.reporterName} created ${t.key}`, createdAt: t.createdAt,
    });
    trail.forEach((status, i) => {
      if (i === 0) return;
      const from = trail[i - 1];
      const at_ = new Date(start + span * (i / trail.length)).toISOString();
      const actor = t.assigneeId && i % 2 === 0 ? t.assigneeId : t.reporterId;
      out.push({
        id: `act-${t.key}-${i}`, ticketKey: t.key, authorId: actor, authorName: NAMES[actor] || t.reporterName,
        kind: 'status', field: 'Status', from, to: status,
        text: `${NAMES[actor] || 'Someone'} changed Status from ${from} to ${status}`,
        createdAt: at_,
      });
    });
    if (t.assigneeId) {
      out.push({
        id: `act-${t.key}-asg`, ticketKey: t.key, authorId: t.reporterId, authorName: t.reporterName,
        kind: 'field', field: 'Assignee', from: null, to: t.assigneeName,
        text: `${t.reporterName} assigned ${t.key} to ${t.assigneeName}`,
        createdAt: new Date(start + span * 0.15).toISOString(),
      });
    }
    if (t.status === 'Done' && t.resolution) {
      out.push({
        id: `act-${t.key}-res`, ticketKey: t.key, authorId: t.assigneeId || t.reporterId, authorName: t.assigneeName || t.reporterName,
        kind: 'field', field: 'Resolution', from: null, to: t.resolution,
        text: `${t.assigneeName || t.reporterName} set Resolution to ${t.resolution}`,
        createdAt: t.resolvedAt || t.updatedAt,
      });
    }
    (t as any)._trail = undefined;
  });
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export const seedActivity: ActivityEntry[] = buildActivity(seedTickets);

// ---------------------------------------------------------------- comments
export const seedComments: TicketComment[] = [
  { id: 'tc-1', ticketKey: 'EMA-111', authorId: 'u-1', authorName: 'Rishikesh Oza', authorRole: 'Operations Manager', body: 'Reproduced on two machines. @Gaurav Bhangale please take this as the top priority for Sprint 25.', mentions: ['u-4'], createdAt: at(8, 11, 5), editedAt: null, edits: [] },
  { id: 'tc-2', ticketKey: 'EMA-111', authorId: 'u-4', authorName: 'Gaurav Bhangale', authorRole: 'Technical Team Member', body: 'Found it — `hydrate()` reads a stale user from localStorage. Pushing a fix that re-hydrates from the API.', mentions: [], createdAt: at(5, 15, 40), editedAt: at(5, 15, 52), edits: [{ body: 'Found it — `hydrate()` reads a stale user from localStorage. Raising a fix now.', at: at(5, 15, 52) }] },
  { id: 'tc-3', ticketKey: 'EMA-115', authorId: 'u-5', authorName: 'Ananya Singh', authorRole: 'Technical Team Member', body: 'Blocked on the MPLS vendor. Ticket `MPLS-88214` raised, ETA 48h. @Pratik Mulgir FYI.', mentions: ['u-3'], createdAt: at(4, 9, 20), editedAt: null, edits: [] },
  { id: 'tc-4', ticketKey: 'EMA-112', authorId: 'u-7', authorName: 'Sneha Kulkarni', authorRole: 'Technical Team Member', body: 'Unit tests added for `canTransition`. Ready for review — note that **Done → Reopened** is the only exit.', mentions: [], createdAt: at(2, 17, 5), editedAt: null, edits: [] },
  { id: 'tc-5', ticketKey: 'EMA-112', authorId: 'u-3', authorName: 'Pratik Mulgir', authorRole: 'Project Manager', body: 'Looks good. Please also cover the case where the actor lacks permission.', mentions: [], createdAt: at(1, 10, 30), editedAt: null, edits: [] },
  { id: 'tc-6', ticketKey: 'EMA-113', authorId: 'u-3', authorName: 'Pratik Mulgir', authorRole: 'Project Manager', body: 'Seen twice in staging this morning. @Sneha Kulkarni can you check the watcher list?', mentions: ['u-7'], createdAt: at(3, 12, 0), editedAt: null, edits: [] },
  { id: 'tc-7', ticketKey: 'EMA-119', authorId: 'u-5', authorName: 'Ananya Singh', authorRole: 'Technical Team Member', body: 'Signature block now renders. Attaching a sample PDF in the next build.', mentions: [], createdAt: at(2, 14, 15), editedAt: null, edits: [] },
  { id: 'tc-8', ticketKey: 'EMA-129', authorId: 'u-7', authorName: 'Sneha Kulkarni', authorRole: 'Technical Team Member', body: 'Two cases created as `2026-0001` in January and again in the rollover week. Data fix needed for 14 rows.', mentions: [], createdAt: at(6, 10, 45), editedAt: null, edits: [] },
  { id: 'tc-9', ticketKey: 'EMA-101', authorId: 'u-5', authorName: 'Ananya Singh', authorRole: 'Technical Team Member', body: 'Root cause: the expiry check ran after session creation. Fixed and verified.', mentions: [], createdAt: at(13, 16, 20), editedAt: null, edits: [] },
  { id: 'tc-10', ticketKey: 'EMA-107', authorId: 'u-3', authorName: 'Pratik Mulgir', authorRole: 'Project Manager', body: 'Reopening — the spec is missing the error code table.', mentions: [], createdAt: at(3, 11, 10), editedAt: null, edits: [] },
];

// ---------------------------------------------------------------- work logs
export const seedWorkLogs: WorkLog[] = [
  { id: 'wl-1', ticketKey: 'EMA-111', authorId: 'u-4', authorName: 'Gaurav Bhangale', hours: 3.5, spentAt: day(-3), note: 'Traced hydrate() flow and added user refresh', createdAt: at(3, 18, 0) },
  { id: 'wl-2', ticketKey: 'EMA-111', authorId: 'u-4', authorName: 'Gaurav Bhangale', hours: 3, spentAt: day(-1), note: 'Tests + matrix UI wiring', createdAt: at(1, 17, 30) },
  { id: 'wl-3', ticketKey: 'EMA-112', authorId: 'u-7', authorName: 'Sneha Kulkarni', hours: 5, spentAt: day(-2), note: 'Transition table UI', createdAt: at(2, 16, 0) },
  { id: 'wl-4', ticketKey: 'EMA-112', authorId: 'u-7', authorName: 'Sneha Kulkarni', hours: 4, spentAt: day(-1), note: 'Settings persistence + tests', createdAt: at(1, 15, 0) },
  { id: 'wl-5', ticketKey: 'EMA-115', authorId: 'u-5', authorName: 'Ananya Singh', hours: 3, spentAt: day(-2), note: 'Packet capture and vendor handoff', createdAt: at(2, 13, 0) },
  { id: 'wl-6', ticketKey: 'EMA-119', authorId: 'u-5', authorName: 'Ananya Singh', hours: 4, spentAt: day(-2), note: 'Puppeteer margin fixes', createdAt: at(2, 12, 0) },
  { id: 'wl-7', ticketKey: 'EMA-114', authorId: 'u-5', authorName: 'Ananya Singh', hours: 6, spentAt: day(-2), note: 'Scanner driver integration', createdAt: at(2, 18, 30) },
  { id: 'wl-8', ticketKey: 'EMA-104', authorId: 'u-5', authorName: 'Ananya Singh', hours: 9, spentAt: day(-15), note: 'Chunked import implementation', createdAt: at(15, 17, 0) },
  { id: 'wl-9', ticketKey: 'EMA-104', authorId: 'u-5', authorName: 'Ananya Singh', hours: 9, spentAt: day(-14), note: 'Load testing with 12k records', createdAt: at(14, 17, 0) },
  { id: 'wl-10', ticketKey: 'EMA-102', authorId: 'u-4', authorName: 'Gaurav Bhangale', hours: 10, spentAt: day(-16), note: 'Audit trail investigation', createdAt: at(16, 17, 0) },
  { id: 'wl-11', ticketKey: 'EMA-120', authorId: 'u-4', authorName: 'Gaurav Bhangale', hours: 3, spentAt: day(-1), note: 'Redis counter spike', createdAt: at(1, 16, 45) },
  { id: 'wl-12', ticketKey: 'EMA-113', authorId: 'u-7', authorName: 'Sneha Kulkarni', hours: 4, spentAt: day(-1), note: 'Repro + de-dup fix', createdAt: at(1, 18, 10) },
];

// ---------------------------------------------------------------- notifications
export const seedNotifications: TicketNotification[] = [
  { id: 'nt-1', userId: 'u-3', kind: 'statusChanged', ticketKey: 'EMA-112', title: 'EMA-112 moved to In Review', body: 'Sneha Kulkarni moved "Ticket workflow editor" to In Review', createdAt: at(1, 10, 35), read: false },
  { id: 'nt-2', userId: 'u-3', kind: 'assigned', ticketKey: 'EMA-128', title: 'You are watching EMA-128', body: 'SAML SSO with the Maharashtra e-Governance IdP is in the backlog', createdAt: at(6, 9, 0), read: false },
  { id: 'nt-3', userId: 'u-4', kind: 'assigned', ticketKey: 'EMA-111', title: 'EMA-111 assigned to you', body: 'Role based access matrix does not persist toggles after refresh', createdAt: at(8, 11, 10), read: false },
  { id: 'nt-4', userId: 'u-4', kind: 'mentioned', ticketKey: 'EMA-111', title: 'Rishikesh Oza mentioned you', body: 'on EMA-111: "please take this as the top priority for Sprint 25"', createdAt: at(8, 11, 6), read: true },
  { id: 'nt-5', userId: 'u-5', kind: 'statusChanged', ticketKey: 'EMA-115', title: 'EMA-115 is Blocked', body: 'Nagpur FSL VPN drops every 4 hours during large transfers', createdAt: at(1, 9, 45), read: false },
  { id: 'nt-6', userId: 'u-7', kind: 'mentioned', ticketKey: 'EMA-113', title: 'Pratik Mulgir mentioned you', body: 'on EMA-113: "can you check the watcher list?"', createdAt: at(3, 12, 1), read: false },
  { id: 'nt-7', userId: 'u-1', kind: 'statusChanged', ticketKey: 'EMA-109', title: 'EMA-109 resolved', body: 'Nightly backup job not running on Sundays — Done', createdAt: at(10, 17, 50), read: true },
];

export const seedSettings: TicketSettings = defaultTicketSettings();
