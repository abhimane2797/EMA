import { keepPreviousData, useMutation, useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { ticketApi } from './ticketApi';
import { toast } from '../store/toastStore';
import {
  ActivityEntry, BacklogSnapshot, DashboardSummary, ReportsData, Sprint, SprintBurndownPoint, Ticket,
  TicketComment, TicketDetailBundle, TicketListParams, TicketNotification, TicketSettings,
  TicketStatus, WorkLog,
} from '../types';
import { CreateTicketInput, TicketPatch } from '../mocks/store';
import { Paginated } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../api';
import { Project, User } from '../../../types';

export const ticketKeys = {
  all: ['tickets'] as const,
  list: (params: TicketListParams) => ['tickets', 'list', params] as const,
  detail: (key: string) => ['tickets', 'detail', key] as const,
  sprints: ['tickets', 'sprints'] as const,
  burndown: (id: string) => ['tickets', 'burndown', id] as const,
  backlog: ['tickets', 'backlog'] as const,
  dashboard: ['tickets', 'dashboard'] as const,
  reports: (from: string, to: string) => ['tickets', 'reports', from, to] as const,
  settings: ['tickets', 'settings'] as const,
  notifications: ['tickets', 'notifications'] as const,
};

const errMsg = (e: any) => e?.response?.data?.message || e?.message || 'Something went wrong';

type ListData = Paginated<Ticket>;

const snapshotQueries = (qc: ReturnType<typeof useQueryClient>) => qc.getQueriesData({ queryKey: ticketKeys.all });
const restoreQueries = (qc: ReturnType<typeof useQueryClient>, snap: [unknown, unknown][]) =>
  snap.forEach(([key, data]) => qc.setQueryData(key as any, data));

const patchLists = (qc: ReturnType<typeof useQueryClient>, key: string, patch: Partial<Ticket>) => {
  qc.getQueriesData<ListData>({ queryKey: ['tickets', 'list'] }).forEach(([qk, data]) => {
    if (!data?.data) return;
    qc.setQueryData(qk, { ...data, data: data.data.map(t => (t.key === key ? { ...t, ...patch } : t)) });
  });
};

const invalidateAll = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ticketKeys.all });

// ---------------------------------------------------------------- queries
export function useTickets(params: TicketListParams, options?: Partial<UseQueryOptions<ListData>>) {
  return useQuery<ListData>({
    queryKey: ticketKeys.list(params),
    queryFn: () => ticketApi.list(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useTicket(key: string | undefined) {
  return useQuery<TicketDetailBundle>({
    queryKey: ticketKeys.detail(key || ''),
    queryFn: () => ticketApi.get(key!),
    enabled: !!key,
  });
}

export function useSprints() {
  return useQuery<Sprint[]>({ queryKey: ticketKeys.sprints, queryFn: () => ticketApi.sprints() });
}

export function useBurndown(sprintId: string | null, enabled = true) {
  return useQuery<SprintBurndownPoint[]>({
    queryKey: ticketKeys.burndown(sprintId || ''),
    queryFn: () => ticketApi.burndown(sprintId!),
    enabled: !!sprintId && enabled,
  });
}

export function useBacklog() {
  return useQuery<BacklogSnapshot>({ queryKey: ticketKeys.backlog, queryFn: () => ticketApi.backlog() });
}

export function useDashboard() {
  return useQuery<DashboardSummary>({ queryKey: ticketKeys.dashboard, queryFn: () => ticketApi.dashboard(currentUser()) });
}

export function useReports(from: string, to: string) {
  return useQuery<ReportsData>({ queryKey: ticketKeys.reports(from, to), queryFn: () => ticketApi.reports(from, to) });
}

export function useTicketSettings() {
  return useQuery<TicketSettings>({ queryKey: ticketKeys.settings, queryFn: () => ticketApi.settings() });
}

export function useNotifications() {
  return useQuery<TicketNotification[]>({
    queryKey: ticketKeys.notifications,
    queryFn: () => ticketApi.notifications(),
    refetchInterval: 30000,
  });
}

export function useActivity(key: string | undefined) {
  return useQuery<ActivityEntry[]>({
    queryKey: ['tickets', 'activity', key],
    queryFn: () => ticketApi.activity(key!),
    enabled: !!key,
  });
}

function currentUser() {
  return useAuthStore.getState().user?.id || 'u-1';
}

export function useTicketUsers() {
  return useQuery<User[]>({
    queryKey: ['tickets', 'users'],
    queryFn: () => api.listUsers(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTicketProjects() {
  return useQuery<Project[]>({
    queryKey: ['tickets', 'projects'],
    queryFn: () => api.listProjects(),
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------- mutations
export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => ticketApi.create(input),
    onSuccess: (t) => { toast(`${t.key} created`, 'success'); invalidateAll(qc); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, patch }: { key: string; patch: TicketPatch }) => ticketApi.update(key, patch),
    onMutate: async ({ key, patch }) => {
      await qc.cancelQueries({ queryKey: ticketKeys.all });
      const snap = snapshotQueries(qc);
      qc.setQueryData<TicketDetailBundle>(ticketKeys.detail(key), (old) =>
        old ? { ...old, ticket: { ...old.ticket, ...(patch as Partial<Ticket>) } } : old);
      patchLists(qc, key, patch as Partial<Ticket>);
      return { snap };
    },
    onError: (e, _v, ctx) => { restoreQueries(qc, ctx?.snap || []); toast(errMsg(e), 'error'); },
    onSettled: () => invalidateAll(qc),
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, status, resolution }: { key: string; status: TicketStatus; resolution?: Ticket['resolution'] | null }) =>
      ticketApi.setStatus(key, status, resolution ?? null),
    onMutate: async ({ key, status, resolution }) => {
      await qc.cancelQueries({ queryKey: ticketKeys.all });
      const snap = snapshotQueries(qc);
      qc.setQueryData<TicketDetailBundle>(ticketKeys.detail(key), (old) =>
        old ? { ...old, ticket: { ...old.ticket, status, resolution: resolution ?? old.ticket.resolution } } : old);
      patchLists(qc, key, { status, resolution: resolution ?? null, resolvedAt: status === 'Done' ? new Date().toISOString() : null });
      return { snap };
    },
    onError: (e, _v, ctx) => { restoreQueries(qc, ctx?.snap || []); toast(errMsg(e), 'error'); },
    onSettled: (_d, _e, vars) => { invalidateAll(qc); if (vars.status) toast(`Moved ${vars.key} to ${vars.status}`, 'success'); },
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => ticketApi.remove(key),
    onSuccess: (_r, key) => { toast(`${key} deleted`, 'success'); invalidateAll(qc); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useBulkTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ keys, action, payload }: { keys: string[]; action: string; payload?: any }) => ticketApi.bulk(keys, action, payload),
    onSuccess: (r) => { toast(`${r.deleted || r.updated} ticket${(r.deleted || r.updated) === 1 ? '' : 's'} updated`, 'success'); invalidateAll(qc); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useCloneTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => ticketApi.clone(key),
    onSuccess: (t) => { toast(`Cloned to ${t.key}`, 'success'); invalidateAll(qc); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, body, mentions }: { key: string; body: string; mentions: string[] }) => ticketApi.addComment(key, body, mentions),
    onSuccess: (_c, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useEditComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, commentId, body }: { key: string; commentId: string; body: string }) => ticketApi.editComment(key, commentId, body),
    onSuccess: (_c, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); toast('Comment updated', 'success'); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useAddWorkLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, input }: { key: string; input: { hours: number; spentAt: string; note?: string } }) => ticketApi.addWorkLog(key, input),
    onSuccess: (_r, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); toast('Time logged', 'success'); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useDeleteWorkLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, workLogId }: { key: string; workLogId: string }) => ticketApi.deleteWorkLog(key, workLogId),
    onSuccess: (_r, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); toast('Work log removed', 'success'); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useLinkTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, targetKey, type }: { key: string; targetKey: string; type: any }) => ticketApi.link(key, targetKey, type),
    onSuccess: (_t, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); toast('Tickets linked', 'success'); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useUnlinkTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, linkId }: { key: string; linkId: string }) => ticketApi.unlink(key, linkId),
    onSuccess: (_t, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useWatchTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, userId, watch }: { key: string; userId: string; watch: boolean }) => ticketApi.watch(key, userId, watch),
    onSuccess: (_t, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useSetSubtasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, subtasks }: { key: string; subtasks: Ticket['subtasks'] }) => ticketApi.setSubtasks(key, subtasks),
    onSuccess: (_t, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useAddAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, attachment }: { key: string; attachment: Ticket['attachments'][number] }) => ticketApi.addAttachment(key, attachment),
    onSuccess: (_t, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); toast('Attachment added', 'success'); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useRemoveAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, attachmentId }: { key: string; attachmentId: string }) => ticketApi.removeAttachment(key, attachmentId),
    onSuccess: (_t, { key }) => { qc.invalidateQueries({ queryKey: ticketKeys.detail(key) }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useMoveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, sprintId, beforeKey }: { key: string; sprintId: string | null; beforeKey?: string | null }) => ticketApi.move(key, { sprintId, beforeKey }),
    onMutate: async ({ key, sprintId }) => {
      await qc.cancelQueries({ queryKey: ticketKeys.backlog });
      const snap = qc.getQueryData(ticketKeys.backlog);
      qc.setQueryData<BacklogSnapshot>(ticketKeys.backlog, (old) => {
        if (!old) return old;
        const ticket = [...old.backlog, ...old.sprints.flatMap(s => s.tickets)].find(t => t.key === key);
        if (!ticket) return old;
        const moved = { ...ticket, sprintId };
        return {
          backlog: [...old.backlog.filter(t => t.key !== key), ...(sprintId ? [] : [moved])],
          sprints: old.sprints.map(s => ({
            ...s,
            tickets: [...s.tickets.filter(t => t.key !== key), ...(s.sprint.id === sprintId ? [moved] : [])],
          })),
        };
      });
      return { snap };
    },
    onError: (e, _v, ctx) => { if (ctx?.snap) qc.setQueryData(ticketKeys.backlog, ctx.snap); toast(errMsg(e), 'error'); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ticketKeys.backlog }); qc.invalidateQueries({ queryKey: ticketKeys.sprints }); },
  });
}

export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; goal: string; startDate: string; endDate: string }) => ticketApi.createSprint(input),
    onSuccess: () => { toast('Sprint created', 'success'); qc.invalidateQueries({ queryKey: ticketKeys.sprints }); qc.invalidateQueries({ queryKey: ticketKeys.backlog }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useStartSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ticketApi.startSprint(id),
    onSuccess: () => { toast('Sprint started', 'success'); qc.invalidateQueries({ queryKey: ticketKeys.sprints }); qc.invalidateQueries({ queryKey: ticketKeys.backlog }); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useCompleteSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, moveUnfinishedTo }: { id: string; moveUnfinishedTo: string | 'backlog' }) => ticketApi.completeSprint(id, moveUnfinishedTo),
    onSuccess: () => { toast('Sprint completed', 'success'); invalidateAll(qc); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<TicketSettings>) => ticketApi.saveSettings(patch),
    onSuccess: (s) => { qc.setQueryData(ticketKeys.settings, s); toast('Settings saved', 'success'); },
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | 'all') => ticketApi.markNotificationsRead(ids),
    onSuccess: (list) => qc.setQueryData(ticketKeys.notifications, list),
    onError: (e) => toast(errMsg(e), 'error'),
  });
}

export type { TicketComment, WorkLog };
