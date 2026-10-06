import { addDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import { Paginated } from '../../../types';
import {
  AdvancedFilter, ActivityEntry, BacklogSnapshot, DashboardSummary, FilterRule, ReportsData,
  Sprint, SprintBurndownPoint, Ticket, TicketComment, TicketDetailBundle, TicketLinkType, TicketListParams,
  TicketNotification, TicketSettings, TicketStatus, WorkLog,
} from '../types';
import { canTransition, formatDuration, isOpenStatus, isOverdue, PRIORITY_RANK, TICKET_STATUSES } from '../constants';
import { seedActivity, seedComments, seedNotifications, seedSettings, seedSprints, seedTickets, seedWorkLogs } from './seed';

type Actor = { id: string; name: string };
type CommentActor = Actor & { role: any };

interface Db {
  tickets: Ticket[];
  sprints: Sprint[];
  comments: TicketComment[];
  workLogs: WorkLog[];
  activity: ActivityEntry[];
  notifications: TicketNotification[];
  readIds: string[];
  settings: TicketSettings;
  counter: number;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const isoNow = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const endOfDay = (d: Date) => { const x = startOfDay(d); x.setHours(23, 59, 59, 999); return x; };

const db: Db = {
  tickets: clone(seedTickets),
  sprints: clone(seedSprints),
  comments: clone(seedComments),
  workLogs: clone(seedWorkLogs),
  activity: clone(seedActivity),
  notifications: clone(seedNotifications),
  readIds: [],
  settings: clone(seedSettings),
  counter: 130,
};

// users injected by the api layer so names stay in sync with the users module
let USERS: { id: string; employeeName: string }[] = [];
export const __setUsers = (users: { id: string; employeeName: string }[]) => { USERS = users || []; };
const findUser = (id: string | null | undefined) => {
  if (!id) return null;
  const u = USERS.find(x => x.id === id);
  return u ? u.employeeName : null;
};

const logActivity = (ticketKey: string, actor: Actor, entry: Omit<ActivityEntry, 'id' | 'ticketKey' | 'authorId' | 'authorName' | 'createdAt'>) => {
  const rec: ActivityEntry = { ...entry, id: uid('act'), ticketKey, authorId: actor.id, authorName: actor.name, createdAt: isoNow() };
  db.activity.push(rec);
  return rec;
};

const notify = (userId: string | null, kind: TicketNotification['kind'], ticketKey: string, title: string, body: string) => {
  if (!userId) return;
  db.notifications.unshift({ id: uid('nt'), userId, kind, ticketKey, title, body, createdAt: isoNow(), read: false });
};

const findTicket = (key: string) => {
  const t = db.tickets.find(x => x.key === key);
  if (!t) throw Object.assign(new Error(`Ticket ${key} not found`), { status: 404 });
  return t;
};

const touch = (t: Ticket) => { t.updatedAt = isoNow(); };
const nextKey = () => `${db.settings.keyPrefix}-${(db.counter += 1)}`;

const fieldLabel: Record<string, string> = {
  title: 'Title', description: 'Description', priority: 'Priority', severity: 'Severity', type: 'Type',
  assigneeName: 'Assignee', reporterName: 'Reporter', dueDate: 'Due Date', startDate: 'Start Date',
  originalEstimate: 'Original Estimate', remainingEstimate: 'Remaining Estimate', storyPoints: 'Story Points',
  labels: 'Labels', components: 'Components', linkedTaskId: 'Linked Task', resolution: 'Resolution', sprintId: 'Sprint',
};
const val = (v: any) => Array.isArray(v) ? v.join(', ') : v === null || v === undefined || v === '' ? 'none' : String(v);
const allowedTransitions = (s: TicketStatus): TicketStatus[] => db.settings.workflow[s] || [];

// ---------------------------------------------------------------- list / read
export function listTickets(params: TicketListParams = {}): Paginated<Ticket> {
  let data = [...db.tickets];
  const q = (params.q || '').toLowerCase().trim();
  if (q) data = data.filter(t => t.key.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  const one = (arr?: string[]) => (arr && arr.length ? arr : null);
  if (one(params.status)) data = data.filter(t => params.status!.includes(t.status));
  if (one(params.priority)) data = data.filter(t => params.priority!.includes(t.priority));
  if (one(params.type)) data = data.filter(t => params.type!.includes(t.type));
  if (params.assignee) data = data.filter(t => (params.assignee === 'unassigned' ? !t.assigneeId : t.assigneeId === params.assignee));
  if (params.reporter) data = data.filter(t => t.reporterId === params.reporter);
  if (params.label) data = data.filter(t => t.labels.includes(params.label!));
  if (params.sprintId) data = data.filter(t => (params.sprintId === 'none' ? !t.sprintId : t.sprintId === params.sprintId));
  if (params.onlyMine) data = data.filter(t => t.assigneeId === params.onlyMine);
  if (params.overdue) data = data.filter(t => isOverdue(t.dueDate, t.status));
  if (params.advanced && params.advanced.rules.length) data = data.filter(t => matchAdvanced(t, params.advanced!));

  const dir = params.sortDir === 'asc' ? 1 : -1;
  const sortBy = params.sortBy || 'updatedAt';
  data.sort((a, b) => {
    if (sortBy === 'priority') return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * dir * -1;
    const av: any = (a as any)[sortBy] ?? '';
    const bv: any = (b as any)[sortBy] ?? '';
    if (av === bv) return a.key.localeCompare(b.key);
    return av > bv ? dir : -dir;
  });

  const total = data.length;
  const page = params.page || 1;
  const pageSize = params.pageSize || 25;
  return { data: data.slice((page - 1) * pageSize, page * pageSize).map(t => clone(t)), total, page, pageSize };
}

const matchAdvanced = (t: Ticket, f: AdvancedFilter) => {
  const results = f.rules.map(r => matchRule(t, r));
  return f.logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
};

const fieldValue = (t: Ticket, field: string): any => {
  switch (field) {
    case 'assignee': return t.assigneeName || '';
    case 'reporter': return t.reporterName;
    case 'label': return t.labels.join(', ');
    case 'sprint': return t.sprintId ? (db.sprints.find(s => s.id === t.sprintId)?.name || '') : '';
    case 'status': return t.status;
    default: return (t as any)[field];
  }
};

const matchRule = (t: Ticket, r: FilterRule) => {
  const raw = fieldValue(t, r.field);
  const str = raw === null || raw === undefined ? '' : String(raw);
  const needle = (r.value || '').toLowerCase();
  switch (r.operator) {
    case 'is': return str.toLowerCase() === needle;
    case 'is not': return str.toLowerCase() !== needle;
    case 'contains': return str.toLowerCase().includes(needle);
    case 'not contains': return !str.toLowerCase().includes(needle);
    case '>': return r.field === 'dueDate' ? str > r.value : Number(str) > Number(r.value);
    case '<': return r.field === 'dueDate' ? str < r.value : Number(str) < Number(r.value);
    case 'is empty': return !str.trim();
    case 'is not empty': return !!str.trim();
    default: return true;
  }
};

export function getTicket(key: string): Ticket { return clone(findTicket(key)); }

export function getTicketBundle(key: string): TicketDetailBundle {
  return {
    ticket: getTicket(key),
    comments: listComments(key),
    activity: clone(db.activity.filter(a => a.ticketKey === key).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    workLogs: clone(db.workLogs.filter(w => w.ticketKey === key).sort((a, b) => b.spentAt.localeCompare(a.spentAt))),
  };
}

// ---------------------------------------------------------------- create / patch
export interface CreateTicketInput {
  title: string; description?: string; type: Ticket['type']; priority: Ticket['priority'];
  severity?: Ticket['severity']; status?: TicketStatus; reporterId?: string; assigneeId?: string | null;
  projectId?: string; sprintId?: string | null; labels?: string[]; components?: string[];
  dueDate?: string | null; startDate?: string | null; originalEstimate?: number | null;
  remainingEstimate?: number | null; storyPoints?: number | null; linkedTaskId?: string | null;
  attachments?: Ticket['attachments'];
}

export function createTicket(input: CreateTicketInput, actor: Actor): Ticket {
  const key = nextKey();
  const reporterId = input.reporterId || actor.id;
  const now = isoNow();
  const t: Ticket = {
    id: key, key,
    title: input.title.trim(),
    description: input.description || '',
    type: input.type,
    priority: input.priority,
    severity: input.severity || 'Major',
    status: input.status || 'Backlog',
    resolution: null,
    reporterId,
    reporterName: findUser(reporterId) || actor.name,
    assigneeId: input.assigneeId ?? null,
    assigneeName: input.assigneeId ? findUser(input.assigneeId) : null,
    projectId: input.projectId || 'proj-1',
    projectName: 'Computerization of FSL',
    sprintId: input.sprintId ?? null,
    labels: input.labels || [],
    components: input.components || [],
    dueDate: input.dueDate || null,
    startDate: input.startDate || null,
    originalEstimate: input.originalEstimate ?? null,
    timeSpent: 0,
    remainingEstimate: input.remainingEstimate ?? input.originalEstimate ?? null,
    storyPoints: input.storyPoints ?? null,
    linkedTaskId: input.linkedTaskId || null,
    links: [],
    watchers: input.assigneeId ? [input.assigneeId] : [],
    subtasks: [],
    attachments: input.attachments || [],
    rank: (db.counter + 1) * 10,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db.tickets.unshift(t);
  logActivity(key, actor, { kind: 'created', text: `${actor.name} created ${key}` });
  if (t.assigneeId && t.assigneeId !== actor.id) notify(t.assigneeId, 'assigned', key, `${key} assigned to you`, t.title);
  return clone(t);
}

export interface TicketPatch {
  title?: string; description?: string; type?: Ticket['type']; priority?: Ticket['priority'];
  severity?: Ticket['severity']; reporterId?: string; assigneeId?: string | null; sprintId?: string | null;
  labels?: string[]; components?: string[]; dueDate?: string | null; startDate?: string | null;
  originalEstimate?: number | null; remainingEstimate?: number | null; storyPoints?: number | null;
  linkedTaskId?: string | null; resolution?: Ticket['resolution'] | null;
}

export function updateTicket(key: string, patch: TicketPatch, actor: Actor): Ticket {
  const t = findTicket(key);
  const before = clone(t);
  Object.entries(patch).forEach(([field, value]) => {
    const current = (t as any)[field];
    const next = value as any;
    if (JSON.stringify(current ?? null) === JSON.stringify(next ?? null)) return;
    if (field === 'assigneeId') {
      t.assigneeId = next ?? null;
      t.assigneeName = next ? findUser(next) : null;
      logActivity(t.key, actor, { kind: 'field', field: 'Assignee', from: before.assigneeName, to: t.assigneeName, text: `${actor.name} changed Assignee from ${val(before.assigneeName)} to ${val(t.assigneeName)}` });
      if (next && next !== actor.id) notify(next, 'assigned', t.key, `${t.key} assigned to you`, t.title);
      return;
    }
    if (field === 'reporterId') {
      t.reporterId = next;
      t.reporterName = findUser(next) || t.reporterName;
      logActivity(t.key, actor, { kind: 'field', field: 'Reporter', from: before.reporterName, to: t.reporterName, text: `${actor.name} changed Reporter from ${val(before.reporterName)} to ${val(t.reporterName)}` });
      return;
    }
    if (field === 'sprintId') {
      t.sprintId = next ?? null;
      const sprintName = next ? (db.sprints.find(s => s.id === next)?.name || 'sprint') : 'Backlog';
      logActivity(t.key, actor, { kind: 'sprint', field: 'Sprint', from: before.sprintId, to: next, text: `${actor.name} moved ${t.key} to ${sprintName}` });
      return;
    }
    if (field === 'title' || field === 'description') {
      (t as any)[field] = value;
      logActivity(t.key, actor, { kind: 'field', field: fieldLabel[field], from: null, to: null, text: `${actor.name} updated ${fieldLabel[field]}` });
      return;
    }
    (t as any)[field] = next;
    logActivity(t.key, actor, {
      kind: 'field', field: fieldLabel[field] || field,
      from: (before as any)[field] ?? null, to: next ?? null,
      text: `${actor.name} changed ${fieldLabel[field] || field} from ${val((before as any)[field])} to ${val(next)}`,
    });
  });
  touch(t);
  return clone(t);
}

export function setStatus(key: string, status: TicketStatus, resolution: Ticket['resolution'] | null, actor: Actor): Ticket {
  const t = findTicket(key);
  if (t.status === status) return clone(t);
  if (!canTransition(t.status, status)) {
    const allowed = allowedTransitions(t.status);
    throw Object.assign(new Error(`Invalid transition ${t.status} → ${status}. Allowed: ${allowed.join(', ') || 'none'}`), { status: 422 });
  }
  if (status === 'Done' && !resolution) {
    throw Object.assign(new Error('A resolution is required to move a ticket to Done'), { status: 422 });
  }
  const from = t.status;
  t.status = status;
  t.resolution = status === 'Done' ? resolution : null;
  t.resolvedAt = status === 'Done' ? isoNow() : null;
  if (status === 'Done') t.remainingEstimate = 0;
  touch(t);
  logActivity(t.key, actor, { kind: 'status', field: 'Status', from, to: status, text: `${actor.name} changed Status from ${from} to ${status}` });
  if (resolution && status === 'Done') logActivity(t.key, actor, { kind: 'field', field: 'Resolution', from: null, to: resolution, text: `${actor.name} set Resolution to ${resolution}` });
  const interested = new Set<string>([...t.watchers, ...(t.assigneeId ? [t.assigneeId] : [])]);
  interested.forEach(w => { if (w !== actor.id) notify(w, 'statusChanged', t.key, `${t.key} moved to ${status}`, t.title); });
  return clone(t);
}

export function bulkUpdate(keys: string[], action: 'assign' | 'status' | 'priority' | 'label' | 'sprint' | 'delete', payload: any, actor: Actor) {
  if (action === 'delete') {
    const removed = keys.filter(k => db.tickets.some(t => t.key === k));
    db.tickets = db.tickets.filter(t => !keys.includes(t.key));
    db.comments = db.comments.filter(c => !keys.includes(c.ticketKey));
    db.workLogs = db.workLogs.filter(w => !keys.includes(w.ticketKey));
    db.activity = db.activity.filter(a => !keys.includes(a.ticketKey));
    return { deleted: removed.length, updated: 0 };
  }
  let updated = 0;
  keys.forEach(k => {
    if (!db.tickets.some(t => t.key === k)) return;
    if (action === 'status') { setStatus(k, payload.status, payload.resolution || null, actor); updated++; return; }
    if (action === 'assign') { updateTicket(k, { assigneeId: payload.assigneeId ?? null }, actor); updated++; return; }
    if (action === 'priority') { updateTicket(k, { priority: payload.priority }, actor); updated++; return; }
    if (action === 'sprint') { updateTicket(k, { sprintId: payload.sprintId ?? null }, actor); updated++; return; }
    if (action === 'label') {
      const t = findTicket(k);
      if (!t.labels.includes(payload.label)) { updateTicket(k, { labels: [...t.labels, payload.label] }, actor); updated++; }
    }
  });
  return { deleted: 0, updated };
}

export function deleteTicket(key: string, actor: Actor) {
  findTicket(key);
  db.tickets = db.tickets.filter(t => t.key !== key);
  db.comments = db.comments.filter(c => c.ticketKey !== key);
  db.workLogs = db.workLogs.filter(w => w.ticketKey !== key);
  db.activity = db.activity.filter(a => a.ticketKey !== key);
  db.notifications = db.notifications.filter(n => n.ticketKey !== key);
  return { ok: true, deletedBy: actor.name };
}

export function cloneTicket(key: string, actor: Actor): Ticket {
  const src = findTicket(key);
  return createTicket({
    title: `Copy of ${src.title}`, description: src.description, type: src.type, priority: src.priority,
    severity: src.severity, status: 'Backlog', reporterId: actor.id, assigneeId: src.assigneeId,
    projectId: src.projectId, sprintId: src.sprintId, labels: [...src.labels], components: [...src.components],
    dueDate: src.dueDate, startDate: null, originalEstimate: src.originalEstimate,
    remainingEstimate: src.originalEstimate, storyPoints: src.storyPoints, linkedTaskId: src.linkedTaskId,
  }, actor);
}

export function linkTicket(key: string, targetKey: string, type: TicketLinkType, actor: Actor): Ticket {
  const t = findTicket(key);
  if (targetKey === key) throw Object.assign(new Error('A ticket cannot link to itself'), { status: 422 });
  findTicket(targetKey);
  if (t.links.some(l => l.ticketKey === targetKey && l.type === type)) return clone(t);
  t.links.push({ id: uid('lk'), ticketKey: targetKey, type });
  touch(t);
  logActivity(t.key, actor, { kind: 'link', field: 'Linked ticket', from: null, to: targetKey, text: `${actor.name} linked ${key} ${type} ${targetKey}` });
  return clone(t);
}

export function unlinkTicket(key: string, linkId: string, actor: Actor): Ticket {
  const t = findTicket(key);
  const link = t.links.find(l => l.id === linkId);
  t.links = t.links.filter(l => l.id !== linkId);
  touch(t);
  if (link) logActivity(t.key, actor, { kind: 'link', field: 'Linked ticket', from: link.ticketKey, to: null, text: `${actor.name} removed the link to ${link.ticketKey}` });
  return clone(t);
}

export function toggleWatcher(key: string, userId: string, watch: boolean, actor: Actor): Ticket {
  const t = findTicket(key);
  const has = t.watchers.includes(userId);
  if (watch && !has) t.watchers.push(userId);
  if (!watch && has) t.watchers = t.watchers.filter(w => w !== userId);
  touch(t);
  logActivity(t.key, actor, { kind: 'field', field: 'Watchers', from: null, to: null, text: `${actor.name} ${watch ? 'started watching' : 'stopped watching'} ${key}` });
  return clone(t);
}

export function upsertSubtasks(key: string, subtasks: Ticket['subtasks'], actor: Actor): Ticket {
  const t = findTicket(key);
  const before = t.subtasks.filter(s => s.done).length;
  t.subtasks = subtasks;
  const after = subtasks.filter(s => s.done).length;
  touch(t);
  if (before !== after) logActivity(t.key, actor, { kind: 'subtask', field: 'Sub-tasks', from: `${before} done`, to: `${after} done`, text: `${actor.name} updated the sub-task checklist (${after}/${subtasks.length} done)` });
  return clone(t);
}

export function addAttachment(key: string, attachment: Ticket['attachments'][number], actor: Actor): Ticket {
  const t = findTicket(key);
  t.attachments.push(attachment);
  touch(t);
  logActivity(t.key, actor, { kind: 'attachment', field: 'Attachment', from: null, to: attachment.name, text: `${actor.name} attached ${attachment.name}` });
  return clone(t);
}

export function removeAttachment(key: string, attachmentId: string, actor: Actor): Ticket {
  const t = findTicket(key);
  const att = t.attachments.find(a => a.id === attachmentId);
  t.attachments = t.attachments.filter(a => a.id !== attachmentId);
  touch(t);
  if (att) logActivity(t.key, actor, { kind: 'attachment', field: 'Attachment', from: att.name, to: null, text: `${actor.name} removed ${att.name}` });
  return clone(t);
}
// ---------------------------------------------------------------- comments
export function listComments(key: string): TicketComment[] {
  return clone(db.comments.filter(c => c.ticketKey === key).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
}

export function addComment(key: string, body: string, mentions: string[], actor: CommentActor): TicketComment {
  const t = findTicket(key);
  const rec: TicketComment = {
    id: uid('tc'), ticketKey: key, authorId: actor.id, authorName: actor.name, authorRole: actor.role,
    body, mentions: mentions || [], createdAt: isoNow(), editedAt: null, edits: [],
  };
  db.comments.push(rec);
  touch(t);
  logActivity(key, actor, { kind: 'comment', field: 'Comment', from: null, to: null, text: `${actor.name} commented` });
  (mentions || []).forEach(m => {
    if (m !== actor.id) notify(m, 'mentioned', key, `${actor.name} mentioned you`, `on ${key}: "${body.slice(0, 90)}${body.length > 90 ? '…' : ''}"`);
  });
  return clone(rec);
}

const EDIT_WINDOW_MS = 15 * 60 * 1000;

export function editComment(commentId: string, body: string, actor: Actor): TicketComment {
  const c = db.comments.find(x => x.id === commentId);
  if (!c) throw Object.assign(new Error('Comment not found'), { status: 404 });
  if (c.authorId !== actor.id) throw Object.assign(new Error('You can only edit your own comments'), { status: 403 });
  if (Date.now() - new Date(c.createdAt).getTime() > EDIT_WINDOW_MS) {
    throw Object.assign(new Error('The 15 minute edit window has expired'), { status: 403 });
  }
  c.edits.push({ body: c.body, at: isoNow() });
  c.body = body;
  c.editedAt = isoNow();
  return clone(c);
}

// ---------------------------------------------------------------- work log
export function addWorkLog(key: string, input: { hours: number; spentAt: string; note?: string }, actor: Actor) {
  const t = findTicket(key);
  if (!input.hours || input.hours <= 0) throw Object.assign(new Error('Hours must be greater than 0'), { status: 422 });
  const rec: WorkLog = {
    id: uid('wl'), ticketKey: key, authorId: actor.id, authorName: actor.name,
    hours: Math.round(input.hours * 100) / 100, spentAt: input.spentAt, note: input.note || '', createdAt: isoNow(),
  };
  db.workLogs.push(rec);
  t.timeSpent = Math.round((t.timeSpent + rec.hours) * 100) / 100;
  if (t.originalEstimate) t.remainingEstimate = Math.max(0, Math.round((t.originalEstimate - t.timeSpent) * 100) / 100);
  touch(t);
  logActivity(key, actor, { kind: 'worklog', field: 'Work log', from: null, to: formatDuration(rec.hours), text: `${actor.name} logged ${formatDuration(rec.hours)}${input.note ? ` — ${input.note}` : ''}` });
  return { workLog: clone(rec), ticket: clone(t) };
}

export function deleteWorkLog(key: string, workLogId: string, actor: Actor) {
  const t = findTicket(key);
  const w = db.workLogs.find(x => x.id === workLogId);
  if (!w) throw Object.assign(new Error('Work log not found'), { status: 404 });
  db.workLogs = db.workLogs.filter(x => x.id !== workLogId);
  t.timeSpent = Math.max(0, Math.round((t.timeSpent - w.hours) * 100) / 100);
  touch(t);
  logActivity(key, actor, { kind: 'worklog', field: 'Work log', from: formatDuration(w.hours), to: null, text: `${actor.name} removed a ${formatDuration(w.hours)} work log` });
  return clone(t);
}

// ---------------------------------------------------------------- sprints
export function listSprints(): Sprint[] {
  return clone(db.sprints).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function createSprint(input: { name: string; goal: string; startDate: string; endDate: string }): Sprint {
  if (!input.name.trim()) throw Object.assign(new Error('Sprint name is required'), { status: 422 });
  if (input.endDate < input.startDate) throw Object.assign(new Error('End date must be after start date'), { status: 422 });
  const rec: Sprint = {
    id: uid('sp'), name: input.name.trim(), goal: input.goal || '', startDate: input.startDate, endDate: input.endDate,
    status: 'planned', projectId: 'proj-1', completedAt: null,
  };
  db.sprints.push(rec);
  return clone(rec);
}

export function updateSprint(id: string, patch: Partial<Sprint>): Sprint {
  const s = db.sprints.find(x => x.id === id);
  if (!s) throw Object.assign(new Error('Sprint not found'), { status: 404 });
  Object.assign(s, patch, { id: s.id, status: s.status, completedAt: s.completedAt });
  return clone(s);
}

export function startSprint(id: string): Sprint {
  const s = db.sprints.find(x => x.id === id);
  if (!s) throw Object.assign(new Error('Sprint not found'), { status: 404 });
  db.sprints.forEach(x => { if (x.status === 'active') x.status = 'completed'; });
  s.status = 'active';
  return clone(s);
}

export function completeSprint(id: string, moveUnfinishedTo: string | 'backlog'): Sprint {
  const s = db.sprints.find(x => x.id === id);
  if (!s) throw Object.assign(new Error('Sprint not found'), { status: 404 });
  db.tickets.filter(t => t.sprintId === id && t.status !== 'Done').forEach(t => {
    t.sprintId = moveUnfinishedTo === 'backlog' ? null : moveUnfinishedTo;
    touch(t);
  });
  s.status = 'completed';
  s.completedAt = isoNow();
  return clone(s);
}

export function backlogSnapshot(): BacklogSnapshot {
  const order = { active: 0, planned: 1, completed: 2 } as const;
  const sprints = db.sprints.slice().sort((a, b) => order[a.status] - order[b.status] || a.startDate.localeCompare(b.startDate));
  return {
    backlog: clone(db.tickets.filter(t => !t.sprintId).sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.rank - b.rank)),
    sprints: sprints.map(s => ({
      sprint: clone(s),
      tickets: clone(db.tickets.filter(t => t.sprintId === s.id).sort((a, b) => a.rank - b.rank)),
    })),
  };
}

export function moveTicket(key: string, input: { sprintId: string | null; beforeKey?: string | null }, actor: Actor): Ticket {
  const t = findTicket(key);
  const sprintName = input.sprintId ? (db.sprints.find(s => s.id === input.sprintId)?.name || 'sprint') : 'Backlog';
  t.sprintId = input.sprintId;
  if (input.beforeKey) {
    const idx = db.tickets.findIndex(x => x.key === input.beforeKey);
    if (idx >= 0) t.rank = db.tickets[idx].rank - 1;
  }
  touch(t);
  logActivity(t.key, actor, { kind: 'sprint', field: 'Sprint', from: null, to: input.sprintId, text: `${actor.name} moved ${key} to ${sprintName}` });
  return clone(t);
}

export function burndown(sprintId: string): SprintBurndownPoint[] {
  const s = db.sprints.find(x => x.id === sprintId);
  if (!s) return [];
  const tickets = db.tickets.filter(t => t.sprintId === sprintId);
  const committed = tickets.reduce((a, t) => a + (t.storyPoints || 0), 0);
  const start = parseISO(s.startDate);
  const end = parseISO(s.endDate);
  const last = s.status === 'active' ? new Date() : end;
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const points: SprintBurndownPoint[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = addDays(start, i);
    if (d.getTime() > last.getTime() + 86400000) break;
    const cutoff = endOfDay(d).getTime();
    const resolved = tickets.reduce((sum, t) => (t.resolvedAt && new Date(t.resolvedAt).getTime() <= cutoff ? sum + (t.storyPoints || 0) : sum), 0);
    points.push({
      date: format(d, 'yyyy-MM-dd'),
      ideal: Math.round(committed * Math.max(0, 1 - i / Math.max(1, totalDays)) * 10) / 10,
      remaining: Math.max(0, committed - resolved),
    });
  }
  return points;
}

// ---------------------------------------------------------------- dashboard
export function dashboard(userId: string): DashboardSummary {
  const now = new Date();
  const tickets = db.tickets;
  const open = tickets.filter(t => isOpenStatus(t.status));
  const weekAgo = subDays(now, 7).getTime();
  const trend: DashboardSummary['trend'] = [];
  for (let i = 29; i >= 0; i--) {
    const d = subDays(now, i);
    const dayStart = startOfDay(d).getTime();
    const dayEnd = endOfDay(d).getTime();
    trend.push({
      date: format(d, 'dd MMM'),
      created: tickets.filter(t => { const c = new Date(t.createdAt).getTime(); return c >= dayStart && c <= dayEnd; }).length,
      resolved: tickets.filter(t => t.resolvedAt && new Date(t.resolvedAt).getTime() >= dayStart && new Date(t.resolvedAt).getTime() <= dayEnd).length,
    });
  }
  return {
    open: open.length,
    inProgress: tickets.filter(t => t.status === 'In Progress').length,
    overdue: tickets.filter(t => isOverdue(t.dueDate, t.status)).length,
    unassigned: tickets.filter(t => !t.assigneeId && isOpenStatus(t.status)).length,
    resolvedThisWeek: tickets.filter(t => t.resolvedAt && new Date(t.resolvedAt).getTime() >= weekAgo).length,
    byStatus: TICKET_STATUSES.map(s => ({ name: s, value: tickets.filter(t => t.status === s).length })).filter(x => x.value > 0),
    byPriority: db.settings.priorities.map(p => ({ name: p, value: tickets.filter(t => t.priority === p).length })),
    trend,
    assignedToMe: clone(open.filter(t => t.assigneeId === userId).sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 6)),
    recentlyUpdated: clone([...tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6)),
  };
}

// ---------------------------------------------------------------- reports
export function reports(from: string, to: string): ReportsData {
  const start = parseISO(from).getTime();
  const end = parseISO(to).getTime() + 86400000;
  const inRange = (iso: string | null) => !!iso && new Date(iso).getTime() >= start && new Date(iso).getTime() < end;
  const tickets = db.tickets;

  const resolvedInRange = tickets.filter(t => t.resolvedAt && inRange(t.resolvedAt));
  const resolutionTime = resolvedInRange
    .map(t => ({ name: t.key, hours: Math.round(((new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / 3600000) * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours).slice(0, 12);

  const peopleIds = Array.from(new Set(tickets.map(t => t.assigneeId).filter(Boolean) as string[]));
  const byAssignee = peopleIds
    .map(id => ({ name: findUser(id) || id, total: tickets.filter(t => t.assigneeId === id && inRange(t.createdAt)).length, done: tickets.filter(t => t.assigneeId === id && t.status === 'Done' && inRange(t.resolvedAt)).length }))
    .filter(x => x.total > 0).sort((a, b) => b.total - a.total);

  const workload = peopleIds
    .map(id => ({
      name: findUser(id) || id,
      open: tickets.filter(t => t.assigneeId === id && isOpenStatus(t.status)).length,
      timeSpent: Math.round(db.workLogs.filter(w => w.authorId === id).reduce((a, w) => a + w.hours, 0) * 10) / 10,
      tickets: tickets.filter(t => t.assigneeId === id).length,
    }))
    .sort((a, b) => b.open - a.open);

  const velocity = db.sprints
    .filter(s => inRange(s.endDate) || s.status === 'active')
    .map(s => {
      const st = tickets.filter(t => t.sprintId === s.id);
      const committed = st.reduce((a, t) => a + (t.storyPoints || 0), 0);
      const completed = st.filter(t => t.status === 'Done').reduce((a, t) => a + (t.storyPoints || 0), 0);
      return { sprint: clone(s), committedPoints: committed, completedPoints: completed };
    });

  const buckets = [
    { name: '1–3 days', min: 1, max: 3 }, { name: '4–7 days', min: 4, max: 7 },
    { name: '8–14 days', min: 8, max: 14 }, { name: '15–30 days', min: 15, max: 30 },
    { name: '30+ days', min: 31, max: 9999 },
  ];
  const overdueTickets = tickets.filter(t => isOverdue(t.dueDate, t.status));
  const overdueAging = buckets.map(b => ({
    name: b.name,
    value: overdueTickets.filter(t => {
      const age = Math.floor((Date.now() - new Date(t.dueDate!).getTime()) / 86400000);
      return age >= b.min && age <= b.max;
    }).length,
  }));

  const slaBreaches = tickets
    .filter(t => isOpenStatus(t.status))
    .map(t => ({ key: t.key, title: t.title, priority: t.priority, assigneeName: t.assigneeName, hoursOpen: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 3600000) }))
    .filter(x => x.hoursOpen > (db.settings.slaHours[x.priority] || 24))
    .sort((a, b) => b.hoursOpen - a.hoursOpen);

  const avgResolutionHours = resolvedInRange.length
    ? Math.round((resolvedInRange.reduce((a, t) => a + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0) / resolvedInRange.length / 3600000) * 10) / 10
    : 0;

  return {
    resolutionTime, byAssignee, workload, velocity, overdueAging, slaBreaches,
    totals: {
      created: tickets.filter(t => inRange(t.createdAt)).length,
      resolved: resolvedInRange.length,
      avgResolutionHours,
      overdue: overdueTickets.length,
    },
  };
}

// ---------------------------------------------------------------- notifications
export function notifications(userId: string): TicketNotification[] {
  const stored = db.notifications.filter(n => n.userId === userId);
  const dynamic: TicketNotification[] = ticketsDueSoon(userId).map(t => ({
    id: `due-${t.key}-${format(new Date(), 'yyyy-MM-dd')}`,
    userId, kind: 'dueSoon', ticketKey: t.key,
    title: `${t.key} is due soon`,
    body: `${t.title} — due ${t.dueDate}`,
    createdAt: t.dueDate ? new Date(t.dueDate + 'T09:00:00').toISOString() : isoNow(),
    read: db.readIds.includes(`due-${t.key}-${format(new Date(), 'yyyy-MM-dd')}`),
  }));
  return clone([...stored, ...dynamic]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
}

const ticketsDueSoon = (userId: string) => {
  if (!db.tickets.length) return [];
  const soon = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');
  return db.tickets.filter(t =>
    isOpenStatus(t.status) && t.dueDate && t.dueDate <= soon && t.dueDate >= today &&
    (t.assigneeId === userId || t.watchers.includes(userId)));
};

export function markNotificationsRead(ids: string[] | 'all', userId: string): TicketNotification[] {
  if (ids === 'all') {
    db.notifications.forEach(n => { if (n.userId === userId) n.read = true; });
    ticketsDueSoon(userId).forEach(t => {
      const id = `due-${t.key}-${format(new Date(), 'yyyy-MM-dd')}`;
      if (!db.readIds.includes(id)) db.readIds.push(id);
    });
  } else {
    ids.forEach(id => {
      const n = db.notifications.find(x => x.id === id && x.userId === userId);
      if (n) n.read = true;
      if (!db.readIds.includes(id)) db.readIds.push(id);
    });
  }
  return notifications(userId);
}

export function unreadCount(userId: string): number {
  return notifications(userId).filter(n => !n.read).length;
}

// ---------------------------------------------------------------- settings
export function getSettings(): TicketSettings { return clone(db.settings); }

export function saveSettings(patch: Partial<TicketSettings>): TicketSettings {
  db.settings = { ...db.settings, ...patch };
  return clone(db.settings);
}

