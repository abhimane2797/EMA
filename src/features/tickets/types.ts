import { Attachment, RoleType } from '../../types';

export type TicketType = 'Bug' | 'Task' | 'Story' | 'Improvement' | 'Incident';
export type TicketPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
export type TicketSeverity = 'Blocker' | 'Critical' | 'Major' | 'Minor' | 'Trivial';
export type TicketStatus = 'Backlog' | 'To Do' | 'In Progress' | 'In Review' | 'Testing' | 'Done' | 'Blocked' | 'Reopened';
export type TicketResolution = 'Done' | "Won't Fix" | 'Duplicate' | 'Cannot Reproduce';
export type TicketLinkType = 'blocks' | 'is blocked by' | 'relates to' | 'duplicates';
export type SprintStatus = 'planned' | 'active' | 'completed';

export type TicketAttachment = Attachment;

export interface TicketLink {
  id: string;
  ticketKey: string;
  type: TicketLinkType;
}

export interface TicketSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface CommentEdit {
  body: string;
  at: string;
}

export interface TicketComment {
  id: string;
  ticketKey: string;
  authorId: string;
  authorName: string;
  authorRole: RoleType;
  body: string;
  mentions: string[];
  createdAt: string;
  editedAt: string | null;
  edits: CommentEdit[];
}

export type ActivityKind = 'created' | 'status' | 'field' | 'comment' | 'worklog' | 'attachment' | 'link' | 'sprint' | 'subtask';

export interface ActivityEntry {
  id: string;
  ticketKey: string;
  authorId: string;
  authorName: string;
  kind: ActivityKind;
  field?: string;
  from?: string | null;
  to?: string | null;
  text: string;
  createdAt: string;
}

export interface WorkLog {
  id: string;
  ticketKey: string;
  authorId: string;
  authorName: string;
  hours: number;
  spentAt: string;
  note: string;
  createdAt: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  projectId: string;
  completedAt: string | null;
}

export interface Ticket {
  id: string;
  key: string;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  severity: TicketSeverity;
  status: TicketStatus;
  resolution: TicketResolution | null;
  reporterId: string;
  reporterName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  projectId: string;
  projectName: string;
  sprintId: string | null;
  labels: string[];
  components: string[];
  dueDate: string | null;
  startDate: string | null;
  originalEstimate: number | null;
  timeSpent: number;
  remainingEstimate: number | null;
  storyPoints: number | null;
  linkedTaskId: string | null;
  links: TicketLink[];
  watchers: string[];
  subtasks: TicketSubtask[];
  attachments: TicketAttachment[];
  rank: number;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketSettings {
  keyPrefix: string;
  types: TicketType[];
  priorities: TicketPriority[];
  severities: TicketSeverity[];
  resolutions: TicketResolution[];
  labels: string[];
  components: string[];
  workflow: Record<TicketStatus, TicketStatus[]>;
  slaHours: Record<TicketPriority, number>;
}

export type NotificationKind = 'assigned' | 'mentioned' | 'statusChanged' | 'dueSoon';

export interface TicketNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  ticketKey: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

// ---------------------------------------------------------------- list params
export type FilterOperator = 'is' | 'is not' | 'contains' | 'not contains' | '>' | '<' | 'is empty' | 'is not empty';
export type FilterField = 'status' | 'priority' | 'type' | 'assignee' | 'reporter' | 'label' | 'sprint' | 'dueDate' | 'storyPoints' | 'title';

export interface FilterRule {
  id: string;
  field: FilterField;
  operator: FilterOperator;
  value: string;
}

export interface AdvancedFilter {
  logic: 'AND' | 'OR';
  rules: FilterRule[];
}

export interface TicketListParams {
  q?: string;
  status?: string[];
  priority?: string[];
  type?: string[];
  assignee?: string;
  reporter?: string;
  label?: string;
  sprintId?: string;
  onlyMine?: string;
  overdue?: boolean;
  projectId?: string;
  advanced?: AdvancedFilter;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface TicketFilterState {
  q: string;
  status: string[];
  priority: string[];
  type: string[];
  assignee: string;
  reporter: string;
  label: string;
  sprintId: string;
  onlyMine: boolean;
  overdue: boolean;
}

export const emptyTicketFilters = (): TicketFilterState => ({
  q: '', status: [], priority: [], type: [], assignee: '', reporter: '', label: '', sprintId: '', onlyMine: false, overdue: false,
});

// ---------------------------------------------------------------- responses
export interface TicketDetailBundle {
  ticket: Ticket;
  comments: TicketComment[];
  activity: ActivityEntry[];
  workLogs: WorkLog[];
}

export interface DashboardSummary {
  open: number;
  inProgress: number;
  overdue: number;
  unassigned: number;
  resolvedThisWeek: number;
  byStatus: { name: TicketStatus; value: number }[];
  byPriority: { name: TicketPriority; value: number }[];
  trend: { date: string; created: number; resolved: number }[];
  assignedToMe: Ticket[];
  recentlyUpdated: Ticket[];
}

export interface SprintBurndownPoint {
  date: string;
  ideal: number;
  remaining: number;
}

export interface SprintReportRow {
  sprint: Sprint;
  committedPoints: number;
  completedPoints: number;
}

export interface ReportsData {
  resolutionTime: { name: string; hours: number }[];
  byAssignee: { name: string; total: number; done: number }[];
  workload: { name: string; open: number; timeSpent: number; tickets: number }[];
  velocity: SprintReportRow[];
  overdueAging: { name: string; value: number }[];
  slaBreaches: { key: string; title: string; priority: TicketPriority; hoursOpen: number; assigneeName: string | null }[];
  totals: { created: number; resolved: number; avgResolutionHours: number; overdue: number };
}

export interface BacklogSnapshot {
  backlog: Ticket[];
  sprints: { sprint: Sprint; tickets: Ticket[] }[];
}
