import { mockApi } from '../../../api/mockApi';
import { useAuthStore } from '../../../store/authStore';
import { Paginated } from '../../../types';
import { Sprint, Ticket, TicketComment, TicketDetailBundle, TicketLinkType, TicketNotification, TicketSettings, TicketStatus, WorkLog, BacklogSnapshot, DashboardSummary, ReportsData, SprintBurndownPoint, TicketListParams, ActivityEntry } from '../types';
import { CreateTicketInput, TicketPatch, __setUsers, addAttachment, addComment, addWorkLog, backlogSnapshot, burndown, bulkUpdate, cloneTicket, completeSprint, createSprint, createTicket, dashboard, deleteTicket, deleteWorkLog, editComment, getSettings, getTicketBundle, linkTicket, listComments, listSprints, listTickets, markNotificationsRead, moveTicket, notifications, removeAttachment, reports, saveSettings, startSprint, setStatus, toggleWatcher, unlinkTicket, updateSprint, updateTicket, upsertSubtasks } from '../mocks/store';
import { qs, request } from './client';

export type Actor = { id: string; name: string; role: string };

const actor = (): Actor => {
  const u = useAuthStore.getState().user;
  return { id: u?.id || 'u-1', name: u?.employeeName || 'System', role: u?.role || 'Technical Team Member' };
};

const syncUsers = () => { __setUsers(mockApi.getUsersSync()); };

export const ticketApi = {
  async list(params: TicketListParams): Promise<Paginated<Ticket>> {
    syncUsers();
    const p: TicketListParams = { ...params, onlyMine: params.onlyMine || undefined };
    return request('GET', `/tickets${qs(p as any)}`, undefined, () => listTickets(p));
  },
  async get(key: string): Promise<TicketDetailBundle> {
    syncUsers();
    return request('GET', `/tickets/${key}`, undefined, () => getTicketBundle(key));
  },
  async create(input: CreateTicketInput): Promise<Ticket> {
    syncUsers();
    return request('POST', '/tickets', { input, actor: actor() }, () => createTicket(input, actor()));
  },
  async update(key: string, patch: TicketPatch): Promise<Ticket> {
    syncUsers();
    return request('PATCH', `/tickets/${key}`, { patch, actor: actor() }, () => updateTicket(key, patch, actor()));
  },
  async setStatus(key: string, status: TicketStatus, resolution: Ticket['resolution']): Promise<Ticket> {
    syncUsers();
    return request('POST', `/tickets/${key}/status`, { status, resolution, actor: actor() }, () => setStatus(key, status, resolution, actor()));
  },
  async bulk(keys: string[], action: string, payload: any): Promise<{ deleted: number; updated: number }> {
    syncUsers();
    return request('POST', '/tickets/bulk', { keys, action, payload, actor: actor() }, () => bulkUpdate(keys, action as any, payload, actor()));
  },
  async remove(key: string): Promise<any> {
    syncUsers();
    return request('DELETE', `/tickets/${key}`, { actor: actor() }, () => deleteTicket(key, actor()));
  },
  async clone(key: string): Promise<Ticket> {
    syncUsers();
    return request('POST', `/tickets/${key}/clone`, { actor: actor() }, () => cloneTicket(key, actor()));
  },
  async link(key: string, targetKey: string, type: TicketLinkType): Promise<Ticket> {
    syncUsers();
    return request('POST', `/tickets/${key}/links`, { targetKey, type, actor: actor() }, () => linkTicket(key, targetKey, type, actor()));
  },
  async unlink(key: string, linkId: string): Promise<Ticket> {
    syncUsers();
    return request('DELETE', `/tickets/${key}/links/${linkId}`, { actor: actor() }, () => unlinkTicket(key, linkId, actor()));
  },
  async watch(key: string, userId: string, watch: boolean): Promise<Ticket> {
    syncUsers();
    const method = watch ? 'POST' : 'DELETE';
    return request(method, `/tickets/${key}/watchers/${userId}`, { actor: actor() }, () => toggleWatcher(key, userId, watch, actor()));
  },
  async setSubtasks(key: string, subtasks: Ticket['subtasks']): Promise<Ticket> {
    syncUsers();
    return request('PUT', `/tickets/${key}/subtasks`, { subtasks, actor: actor() }, () => upsertSubtasks(key, subtasks, actor()));
  },
  async addAttachment(key: string, attachment: Ticket['attachments'][number]): Promise<Ticket> {
    syncUsers();
    return request('POST', `/tickets/${key}/attachments`, { attachment, actor: actor() }, () => addAttachment(key, attachment, actor()));
  },
  async removeAttachment(key: string, attachmentId: string): Promise<Ticket> {
    syncUsers();
    return request('DELETE', `/tickets/${key}/attachments/${attachmentId}`, { actor: actor() }, () => removeAttachment(key, attachmentId, actor()));
  },
  async comments(key: string): Promise<TicketComment[]> {
    syncUsers();
    return request('GET', `/tickets/${key}/comments`, undefined, () => listComments(key));
  },
  async addComment(key: string, body: string, mentions: string[]): Promise<TicketComment> {
    syncUsers();
    return request('POST', `/tickets/${key}/comments`, { body, mentions, actor: actor() }, () => addComment(key, body, mentions, actor() as any));
  },
  async editComment(key: string, commentId: string, body: string): Promise<TicketComment> {
    syncUsers();
    return request('PATCH', `/tickets/${key}/comments/${commentId}`, { body, actor: actor() }, () => editComment(commentId, body, actor()));
  },
  async workLogs(key: string): Promise<WorkLog[]> {
    syncUsers();
    return request('GET', `/tickets/${key}/worklogs`, undefined, () => getTicketBundle(key).workLogs);
  },
  async addWorkLog(key: string, input: { hours: number; spentAt: string; note?: string }): Promise<{ workLog: WorkLog; ticket: Ticket }> {
    syncUsers();
    return request('POST', `/tickets/${key}/worklogs`, { ...input, actor: actor() }, () => addWorkLog(key, input, actor()));
  },
  async deleteWorkLog(key: string, workLogId: string): Promise<Ticket> {
    syncUsers();
    return request('DELETE', `/tickets/${key}/worklogs/${workLogId}`, { actor: actor() }, () => deleteWorkLog(key, workLogId, actor()));
  },
  async activity(key: string): Promise<ActivityEntry[]> {
    syncUsers();
    return request('GET', `/tickets/${key}/activity`, undefined, () => getTicketBundle(key).activity);
  },

  // sprints
  async sprints(): Promise<Sprint[]> {
    syncUsers();
    return request('GET', '/tickets/sprints', undefined, () => listSprints());
  },
  async createSprint(input: { name: string; goal: string; startDate: string; endDate: string }): Promise<Sprint> {
    syncUsers();
    return request('POST', '/tickets/sprints', input, () => createSprint(input));
  },
  async updateSprint(id: string, patch: Partial<Sprint>): Promise<Sprint> {
    syncUsers();
    return request('PATCH', `/tickets/sprints/${id}`, patch, () => updateSprint(id, patch));
  },
  async startSprint(id: string): Promise<Sprint> {
    syncUsers();
    return request('POST', `/tickets/sprints/${id}/start`, {}, () => startSprint(id));
  },
  async completeSprint(id: string, moveUnfinishedTo: string | 'backlog'): Promise<Sprint> {
    syncUsers();
    return request('POST', `/tickets/sprints/${id}/complete`, { moveUnfinishedTo }, () => completeSprint(id, moveUnfinishedTo));
  },
  async burndown(sprintId: string): Promise<SprintBurndownPoint[]> {
    syncUsers();
    return request('GET', `/tickets/sprints/${sprintId}/burndown`, undefined, () => burndown(sprintId));
  },
  async backlog(): Promise<BacklogSnapshot> {
    syncUsers();
    return request('GET', '/tickets/backlog', undefined, () => backlogSnapshot());
  },
  async move(key: string, input: { sprintId: string | null; beforeKey?: string | null }): Promise<Ticket> {
    syncUsers();
    return request('POST', `/tickets/${key}/move`, { ...input, actor: actor() }, () => moveTicket(key, input, actor()));
  },

  // summaries
  async dashboard(userId: string): Promise<DashboardSummary> {
    syncUsers();
    return request('GET', `/tickets/dashboard${qs({ userId })}`, undefined, () => dashboard(userId));
  },
  async reports(from: string, to: string): Promise<ReportsData> {
    syncUsers();
    return request('GET', `/tickets/reports${qs({ from, to })}`, undefined, () => reports(from, to));
  },
  async notifications(): Promise<TicketNotification[]> {
    syncUsers();
    const userId = actor().id;
    return request('GET', `/tickets/notifications${qs({ userId })}`, undefined, () => notifications(userId));
  },
  async markNotificationsRead(ids: string[] | 'all'): Promise<TicketNotification[]> {
    syncUsers();
    const userId = actor().id;
    return request('POST', '/tickets/notifications/read', { ids, userId }, () => markNotificationsRead(ids, userId));
  },
  async settings(): Promise<TicketSettings> {
    syncUsers();
    return request('GET', '/tickets/settings', undefined, () => getSettings());
  },
  async saveSettings(patch: Partial<TicketSettings>): Promise<TicketSettings> {
    syncUsers();
    return request('PUT', '/tickets/settings', patch, () => saveSettings(patch));
  },
};
