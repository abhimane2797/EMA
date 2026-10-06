import { http, HttpResponse } from 'msw';
import { mockApi } from '../../api/mockApi';
import * as store from '../../features/tickets/mocks/store';
import { TicketListParams } from '../../features/tickets/types';

const syncUsers = () => store.__setUsers(mockApi.getUsersSync());
const actor = (raw: any) => ({ id: raw?.id || 'u-1', name: raw?.name || 'System', role: raw?.role || 'Technical Team Member' });
const ok = (data: any) => HttpResponse.json(data);
const fail = (e: any) => HttpResponse.json({ message: e?.message || 'Request failed' }, { status: (e as any)?.status || 500 });

const readList = (sp: URLSearchParams, key: string) => {
  const values = sp.getAll(key);
  return values.length ? values : undefined;
};

const readParams = (sp: URLSearchParams): TicketListParams => {
  const advanced = sp.get('advanced');
  return {
    q: sp.get('q') || undefined,
    status: readList(sp, 'status'),
    priority: readList(sp, 'priority'),
    type: readList(sp, 'type'),
    assignee: sp.get('assignee') || undefined,
    reporter: sp.get('reporter') || undefined,
    label: sp.get('label') || undefined,
    sprintId: sp.get('sprintId') || undefined,
    projectId: sp.get('projectId') || undefined,
    onlyMine: sp.get('onlyMine') || undefined,
    overdue: sp.get('overdue') === 'true' || undefined,
    sortBy: sp.get('sortBy') || undefined,
    sortDir: (sp.get('sortDir') as any) || undefined,
    page: sp.get('page') ? Number(sp.get('page')) : undefined,
    pageSize: sp.get('pageSize') ? Number(sp.get('pageSize')) : undefined,
    advanced: advanced ? JSON.parse(advanced) : undefined,
  };
};

const run = async <T>(fn: () => T) => {
  syncUsers();
  try { return ok(await fn()); } catch (e) { return fail(e); }
};

/**
 * Every ticket endpoint lives under /api/tickets — literal paths are registered before
 * `:key` routes so "sprints", "settings" … are never captured as ticket keys.
 */
export const ticketHandlers = [
  // ---- collection / summaries
  http.get('/api/tickets', ({ request }) => run(() => store.listTickets(readParams(new URL(request.url).searchParams)))),
  http.post('/api/tickets', async ({ request }) => {
    const { input, actor: a } = await request.json() as any;
    return run(() => store.createTicket(input, actor(a)));
  }),
  http.post('/api/tickets/bulk', async ({ request }) => {
    const { keys, action, payload, actor: a } = await request.json() as any;
    return run(() => store.bulkUpdate(keys, action, payload, actor(a)));
  }),
  http.get('/api/tickets/dashboard', ({ request }) => run(() => store.dashboard(new URL(request.url).searchParams.get('userId') || 'u-1'))),
  http.get('/api/tickets/reports', ({ request }) => {
    const sp = new URL(request.url).searchParams;
    return run(() => store.reports(sp.get('from')!, sp.get('to')!));
  }),
  http.get('/api/tickets/notifications', ({ request }) => run(() => store.notifications(new URL(request.url).searchParams.get('userId') || 'u-1'))),
  http.post('/api/tickets/notifications/read', async ({ request }) => {
    const { ids, userId } = await request.json() as any;
    return run(() => store.markNotificationsRead(ids, userId));
  }),
  http.get('/api/tickets/settings', () => run(() => store.getSettings())),
  http.put('/api/tickets/settings', async ({ request }) => run(async () => store.saveSettings(await request.json() as any))),
  http.get('/api/tickets/backlog', () => run(() => store.backlogSnapshot())),

  // ---- sprints
  http.get('/api/tickets/sprints', () => run(() => store.listSprints())),
  http.post('/api/tickets/sprints', async ({ request }) => run(async () => store.createSprint(await request.json() as any))),
  http.patch('/api/tickets/sprints/:id', async ({ params, request }) => run(async () => store.updateSprint(params.id as string, await request.json() as any))),
  http.post('/api/tickets/sprints/:id/start', ({ params }) => run(() => store.startSprint(params.id as string))),
  http.post('/api/tickets/sprints/:id/complete', async ({ params, request }) => {
    const { moveUnfinishedTo } = await request.json() as any;
    return run(() => store.completeSprint(params.id as string, moveUnfinishedTo));
  }),
  http.get('/api/tickets/sprints/:id/burndown', ({ params }) => run(() => store.burndown(params.id as string))),

  // ---- single ticket
  http.get('/api/tickets/:key', ({ params }) => run(() => store.getTicketBundle(params.key as string))),
  http.patch('/api/tickets/:key', async ({ params, request }) => {
    const { patch, actor: a } = await request.json() as any;
    return run(() => store.updateTicket(params.key as string, patch, actor(a)));
  }),
  http.delete('/api/tickets/:key', async ({ params, request }) => {
    const { actor: a } = (await request.json().catch(() => ({}))) as any;
    return run(() => store.deleteTicket(params.key as string, actor(a)));
  }),
  http.post('/api/tickets/:key/status', async ({ params, request }) => {
    const { status, resolution, actor: a } = await request.json() as any;
    return run(() => store.setStatus(params.key as string, status, resolution, actor(a)));
  }),
  http.post('/api/tickets/:key/clone', async ({ params, request }) => {
    const { actor: a } = await request.json() as any;
    return run(() => store.cloneTicket(params.key as string, actor(a)));
  }),
  http.post('/api/tickets/:key/move', async ({ params, request }) => {
    const { sprintId, beforeKey, actor: a } = await request.json() as any;
    return run(() => store.moveTicket(params.key as string, { sprintId, beforeKey }, actor(a)));
  }),

  // ---- links / watchers / subtasks / attachments
  http.post('/api/tickets/:key/links', async ({ params, request }) => {
    const { targetKey, type, actor: a } = await request.json() as any;
    return run(() => store.linkTicket(params.key as string, targetKey, type, actor(a)));
  }),
  http.delete('/api/tickets/:key/links/:linkId', async ({ params, request }) => {
    const { actor: a } = (await request.json().catch(() => ({}))) as any;
    return run(() => store.unlinkTicket(params.key as string, params.linkId as string, actor(a)));
  }),
  http.post('/api/tickets/:key/watchers/:userId', async ({ params, request }) => {
    const { actor: a } = (await request.json().catch(() => ({}))) as any;
    return run(() => store.toggleWatcher(params.key as string, params.userId as string, true, actor(a)));
  }),
  http.delete('/api/tickets/:key/watchers/:userId', async ({ params, request }) => {
    const { actor: a } = (await request.json().catch(() => ({}))) as any;
    return run(() => store.toggleWatcher(params.key as string, params.userId as string, false, actor(a)));
  }),
  http.put('/api/tickets/:key/subtasks', async ({ params, request }) => {
    const { subtasks, actor: a } = await request.json() as any;
    return run(() => store.upsertSubtasks(params.key as string, subtasks, actor(a)));
  }),
  http.post('/api/tickets/:key/attachments', async ({ params, request }) => {
    const { attachment, actor: a } = await request.json() as any;
    return run(() => store.addAttachment(params.key as string, attachment, actor(a)));
  }),
  http.delete('/api/tickets/:key/attachments/:attachmentId', async ({ params, request }) => {
    const { actor: a } = (await request.json().catch(() => ({}))) as any;
    return run(() => store.removeAttachment(params.key as string, params.attachmentId as string, actor(a)));
  }),

  // ---- comments / activity / work log
  http.get('/api/tickets/:key/comments', ({ params }) => run(() => store.listComments(params.key as string))),
  http.post('/api/tickets/:key/comments', async ({ params, request }) => {
    const { body, mentions, actor: a } = await request.json() as any;
    return run(() => store.addComment(params.key as string, body, mentions || [], actor(a) as any));
  }),
  http.patch('/api/tickets/:key/comments/:commentId', async ({ params, request }) => {
    const { body, actor: a } = await request.json() as any;
    return run(() => store.editComment(params.commentId as string, body, actor(a)));
  }),
  http.get('/api/tickets/:key/activity', ({ params }) => run(() => store.getTicketBundle(params.key as string).activity)),
  http.get('/api/tickets/:key/worklogs', ({ params }) => run(() => store.getTicketBundle(params.key as string).workLogs)),
  http.post('/api/tickets/:key/worklogs', async ({ params, request }) => {
    const { hours, spentAt, note, actor: a } = await request.json() as any;
    return run(() => store.addWorkLog(params.key as string, { hours, spentAt, note }, actor(a)));
  }),
  http.delete('/api/tickets/:key/worklogs/:workLogId', async ({ params, request }) => {
    const { actor: a } = (await request.json().catch(() => ({}))) as any;
    return run(() => store.deleteWorkLog(params.key as string, params.workLogId as string, actor(a)));
  }),
];
