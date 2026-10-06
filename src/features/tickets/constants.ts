import { TicketPriority, TicketStatus, TicketType, TicketSeverity, TicketResolution, TicketLinkType, TicketSettings, TicketFilterState } from './types';

export const TICKET_STATUSES: TicketStatus[] = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Testing', 'Blocked', 'Done', 'Reopened'];

/** Board column order (Reopened is transient, shown after To Do when present). */
export const BOARD_COLUMNS: TicketStatus[] = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Testing', 'Blocked', 'Done'];

/** Allowed transitions — Done may only go to Reopened, a transition to Done needs a resolution. */
export const WORKFLOW: Record<TicketStatus, TicketStatus[]> = {
  'Backlog': ['To Do', 'Blocked'],
  'To Do': ['In Progress', 'Backlog', 'Blocked'],
  'In Progress': ['In Review', 'To Do', 'Blocked'],
  'In Review': ['Testing', 'In Progress', 'Blocked'],
  'Testing': ['Done', 'In Review', 'Blocked'],
  'Blocked': ['Backlog', 'To Do', 'In Progress'],
  'Done': ['Reopened'],
  'Reopened': ['To Do', 'Backlog'],
};

/** Jira style status colours. */
export const STATUS_COLORS: Record<TicketStatus, string> = {
  'Backlog': '#6B778C',
  'To Do': '#5E6C84',
  'In Progress': '#0052CC',
  'In Review': '#6554C0',
  'Testing': '#B65C00',
  'Blocked': '#C9372C',
  'Done': '#00875A',
  'Reopened': '#E56910',
};

/** Chip palette name used when we want a MUI named colour (StatusChip reuse). */
export const STATUS_PALETTE: Record<TicketStatus, 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'> = {
  'Backlog': 'default',
  'To Do': 'default',
  'In Progress': 'info',
  'In Review': 'secondary',
  'Testing': 'warning',
  'Blocked': 'error',
  'Done': 'success',
  'Reopened': 'warning',
};

export const TICKET_PRIORITIES: TicketPriority[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  'Highest': '#C9372C',
  'High': '#E56910',
  'Medium': '#B65C00',
  'Low': '#00875A',
  'Lowest': '#0052CC',
};

export const PRIORITY_RANK: Record<TicketPriority, number> = {
  'Highest': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Lowest': 4,
};

export const TICKET_TYPES: TicketType[] = ['Bug', 'Task', 'Story', 'Improvement', 'Incident'];

export const TICKET_SEVERITIES: TicketSeverity[] = ['Blocker', 'Critical', 'Major', 'Minor', 'Trivial'];

export const TICKET_RESOLUTIONS: TicketResolution[] = ['Done', "Won't Fix", 'Duplicate', 'Cannot Reproduce'];

export const LINK_TYPES: TicketLinkType[] = ['blocks', 'is blocked by', 'relates to', 'duplicates'];

export const DEFAULT_SLA_HOURS: Record<TicketPriority, number> = {
  'Highest': 24, 'High': 48, 'Medium': 120, 'Low': 240, 'Lowest': 480,
};

export const defaultTicketSettings = (): TicketSettings => ({
  keyPrefix: 'EMA',
  types: [...TICKET_TYPES],
  priorities: [...TICKET_PRIORITIES],
  severities: [...TICKET_SEVERITIES],
  resolutions: [...TICKET_RESOLUTIONS],
  labels: ['frontend', 'backend', 'infra', 'security', 'ui-ux', 'data-migration', 'compliance', 'performance', 'lms', 'network'],
  components: ['Web Portal', 'LIMS', 'Auth Service', 'Database', 'Network', 'Reporting', 'API Gateway', 'Mobile App'],
  workflow: JSON.parse(JSON.stringify(WORKFLOW)),
  slaHours: { ...DEFAULT_SLA_HOURS },
});

export const isTerminal = (s: TicketStatus) => s === 'Done';

export const canTransition = (from: TicketStatus, to: TicketStatus) => (WORKFLOW[from] || []).includes(to);

export const isOpenStatus = (s: TicketStatus) => s !== 'Done';

export const isOverdue = (dueDate: string | null, status: TicketStatus) => {
  if (!dueDate || status === 'Done') return false;
  const due = new Date(dueDate + 'T23:59:59').getTime();
  return due < Date.now();
};

/** "2h 30m" → 2.5 (accepts 90, 2.5, 2h, 30m, 1d 2h …) */
export const parseDuration = (value: string): number | null => {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const days = raw.match(/(\d+(?:\.\d+)?)\s*d/);
  const hours = raw.match(/(\d+(?:\.\d+)?)\s*h/);
  const mins = raw.match(/(\d+(?:\.\d+)?)\s*m/);
  if (!days && !hours && !mins) return null;
  const total = (days ? Number(days[1]) * 24 : 0) + (hours ? Number(hours[1]) : 0) + (mins ? Number(mins[1]) / 60 : 0);
  return Math.round(total * 100) / 100;
};

/** 2.5 → "2h 30m" */
export const formatDuration = (hours?: number | null): string => {
  if (hours === null || hours === undefined) return '0h';
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

export const initials = (name?: string | null) =>
  (name || '').split(' ').filter(Boolean).map(s => s[0]).join('').slice(0, 2).toUpperCase();

export const filterStateToParams = (f: TicketFilterState) => ({
  q: f.q || undefined,
  status: f.status.length ? f.status : undefined,
  priority: f.priority.length ? f.priority : undefined,
  type: f.type.length ? f.type : undefined,
  assignee: f.assignee || undefined,
  reporter: f.reporter || undefined,
  label: f.label || undefined,
  sprintId: f.sprintId || undefined,
  overdue: f.overdue || undefined,
});
