/**
 * Real-backend API client.
 *
 * Implements exactly the same surface as `src/api/mockApi.ts` but talks to the
 * NestJS service in `master_backend` (default `http://localhost:3000/api/v1`).
 * `src/api/index.ts` picks this implementation whenever `VITE_API_BASE_URL` is
 * set, otherwise the in-memory mock is used.
 *
 * Translation notes (frontend type  <=>  backend contract):
 *  - Task IDs: the backend stores Mongo `_id`s plus a human `taskNumber`
 *    (`PT-000001` / `CT-000001` / `BC-000001`). The UI keeps using the human
 *    number as `id`; every call resolves it to an `_id` first (and accepts a
 *    raw `_id` too).
 *  - Roles: `role_management` has no role column, so the role string is derived
 *    from the module matrix + designation (projectManagement=No => technical
 *    team member, Director => operations manager, otherwise project manager).
 *  - `ticketManagement` has no backend module and is always false in real mode.
 *  - Progress is not part of the parent-task list response, so it is derived
 *    from the child tasks of each listed parent.
 */
import { apiClient } from './client';
import {
  AccessFlags,
  ActivityEntry,
  Attachment,
  BudgetEntry,
  ChildTask,
  Comment,
  CostCenter,
  Mapping,
  ParentTask,
  Priority,
  Project,
  RoleType,
  Severity,
  TaskMeta,
  TaskPurpose,
  TaskStatus,
  User,
} from '../types';

type Raw = Record<string, any>;

/** Password used when a user is created or reset (backend enforces "strong"). */
export const DEFAULT_PASSWORD = 'Password@123';

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const isObjectId = (value?: unknown): value is string =>
  typeof value === 'string' && OBJECT_ID_RE.test(value);

/**
 * Reads a document id: `_id` for Mongoose documents/sub-documents, `id` for
 * the user view and the stripped attachment payloads.
 */
const idOf = (value: any): string => {
  if (typeof value === 'string') return value;
  if (!value) return '';
  if (value._id) return String(value._id);
  return value.id === undefined || value.id === null ? '' : String(value.id);
};
const text = (value: any): string =>
  value === null || value === undefined ? '' : String(value);
const isoOf = (value: any): string =>
  value ? new Date(value).toISOString() : '';
const dayOf = (value: any): string =>
  value ? new Date(value).toISOString().slice(0, 10) : '';
const hasValue = (value: any): boolean =>
  value !== undefined && value !== null && value !== '';

/** Nest returns validation errors as a string or an array of strings. */
const messageOf = (error: any): string => {
  const raw = error?.response?.data?.message ?? error?.message ?? 'Request failed';
  const parts = (Array.isArray(raw) ? raw : [raw]).map((p: unknown) => String(p));
  return parts.join(' · ') || 'Request failed';
};

export class ApiRequestError extends Error {
  readonly status?: number;
  readonly response?: any;

  constructor(message: string, status?: number, response?: any) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.response = response;
  }
}

async function call<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await fn()).data;
  } catch (error: any) {
    throw new ApiRequestError(
      messageOf(error),
      error?.response?.status,
      error?.response,
    );
  }
}

const http = {
  get: <T>(url: string, params?: Raw) =>
    call<T>(() => apiClient.get(url, { params })),
  post: <T>(url: string, data?: any) =>
    call<T>(() => apiClient.post(url, data)),
  patch: <T>(url: string, data?: any) =>
    call<T>(() => apiClient.patch(url, data)),
  put: <T>(url: string, data?: any) => call<T>(() => apiClient.put(url, data)),
  delete: <T>(url: string) => call<T>(() => apiClient.delete(url)),
};

/** Adds `key` only when the value is present (backend rejects '' for @IsIn). */
const assignIf = (target: Raw, key: string, value: any): void => {
  if (hasValue(value)) target[key] = value;
};

/* ------------------------------------------------------------------ *
 * Caches: human task number -> Mongo id, and user lookups
 * ------------------------------------------------------------------ */
const parentIdsByNumber = new Map<string, string>();
const childIdsByNumber = new Map<string, string>();
const budgetIdsByParent = new Map<string, string>();
const usersById = new Map<string, User>();
let usersCache: User[] = [];
let usersHydration: Promise<void> | null = null;
/** Set once `GET /users` succeeds: that right (`projectManagement`) is also
 *  what lets a caller read every child task, not just their own. */
let managerScope = false;

/**
 * Comment sub-documents store only the author name, so the role chip is
 * resolved from the user list. `GET /users` is manager-only — for technical
 * members the lookup fails silently and the chip is simply omitted.
 */
async function fetchUsers(): Promise<User[]> {
  const list = await http.get<Raw[]>('/users');
  usersCache = (list ?? []).map(mapUser);
  managerScope = true;
  return usersCache;
}

/**
 * Loads the user directory at most once per session. Callers await the shared
 * request, so a second caller cannot overtake the first and read an empty cache.
 */
function hydrateUsersOnce(): Promise<void> {
  if (!usersHydration) {
    usersHydration = fetchUsers()
      .then(() => undefined)
      .catch(() => {
        /* not permitted for this role */
      });
  }
  return usersHydration;
}

const rememberParent = (raw: Raw): Raw => {
  const number = text(raw?.taskNumber);
  if (number) parentIdsByNumber.set(number, idOf(raw));
  return raw;
};
const rememberChild = (raw: Raw): Raw => {
  const number = text(raw?.taskNumber);
  if (number) childIdsByNumber.set(number, idOf(raw));
  return raw;
};

async function resolveParentId(ref: string): Promise<string> {
  if (!hasValue(ref)) throw new ApiRequestError('A parent task is required');
  if (isObjectId(ref)) return ref;
  const cached = parentIdsByNumber.get(ref);
  if (cached) return cached;
  const res = await http.get<{ items: Raw[] }>('/tasks/parent', {
    page: 1,
    limit: 100,
  });
  (res?.items ?? []).forEach(rememberParent);
  const found = parentIdsByNumber.get(ref);
  if (!found) throw new ApiRequestError(`Parent task ${ref} was not found`);
  return found;
}

async function resolveChildId(ref: string): Promise<string> {
  if (!hasValue(ref)) throw new ApiRequestError('A child task is required');
  if (isObjectId(ref)) return ref;
  const cached = childIdsByNumber.get(ref);
  if (cached) return cached;
  const res = await http.get<{ items: Raw[] }>('/tasks/child', {
    page: 1,
    limit: 100,
  });
  (res?.items ?? []).forEach(rememberChild);
  const found = childIdsByNumber.get(ref);
  if (!found) throw new ApiRequestError(`Child task ${ref} was not found`);
  return found;
}

async function resolveBudgetId(parentRef: string): Promise<string> {
  const tracked = budgetIdsByParent.get(parentRef);
  if (tracked) return tracked;
  const parentId = await resolveParentId(parentRef);
  const budgets = await http.get<Raw[]>(`/tasks/parent/${parentId}/budget`);
  const newest = (budgets ?? [])[0];
  if (!newest) {
    throw new ApiRequestError('No budget/cost entry exists for this task yet');
  }
  budgetIdsByParent.set(parentRef, idOf(newest));
  return idOf(newest);
}

/* ------------------------------------------------------------------ *
 * Mappers (raw backend document -> frontend entity)
 * ------------------------------------------------------------------ */
function roleFrom(permissions: Raw | undefined, designation: string): RoleType {
  if (!permissions?.projectManagement) return 'Technical Team Member';
  return /director/i.test(designation || '')
    ? 'Operations Manager'
    : 'Project Manager';
}

/** Maps the frontend access flags onto the backend role_management columns. */
const ACCESS_TO_MODULE: [keyof AccessFlags, string][] = [
  ['projectManagement', 'projectManagement'],
  ['taskManagement', 'taskManagement'],
  ['assetManagement', 'assetManagement'],
  ['incidentManagement', 'incidentManagement'],
  ['reportsDashboard', 'reportinganddashboard'],
];

const permissionsFromRole = (role: RoleType): Raw => {
  if (role === 'Operations Manager') {
    return {
      projectManagement: true,
      taskManagement: true,
      assetManagement: true,
      incidentManagement: true,
      reportinganddashboard: true,
    };
  }
  if (role === 'Project Manager') {
    return {
      projectManagement: true,
      taskManagement: true,
      assetManagement: false,
      incidentManagement: false,
      reportinganddashboard: true,
    };
  }
  return {
    projectManagement: false,
    taskManagement: true,
    assetManagement: false,
    incidentManagement: false,
    reportinganddashboard: true,
  };
};

const permissionsFromAccess = (access: Raw): Raw => {
  const out: Raw = {};
  ACCESS_TO_MODULE.forEach(([frontendKey, backendKey]) => {
    out[backendKey] = Boolean(access?.[frontendKey]);
  });
  return out;
};

const mapUser = (raw: Raw): User => {
  const inn = raw ?? {};
  const user: User = {
    id: idOf(inn),
    loginId: text(inn.loginId),
    employeeName: text(inn.employeeName),
    designation: text(inn.designation),
    role: roleFrom(inn.permissions, text(inn.designation)),
    projectId: text(inn.projectId),
    projectName: text(inn.project?.name),
    status: inn.status === 'Inactive' ? 'Inactive' : 'Active',
    createdAt: isoOf(inn.userCreationDate ?? inn.createdAt),
    effectiveEndDate: inn.effectiveEndDate ?? null,
    // The backend does not expose passwordChangedAt, so expiry cannot be
    // computed here (see the integration notes in the README).
    passwordChangedAt: '',
    access: {
      projectManagement: Boolean(inn.permissions?.projectManagement),
      taskManagement: Boolean(inn.permissions?.taskManagement),
      assetManagement: Boolean(inn.permissions?.assetManagement),
      incidentManagement: Boolean(inn.permissions?.incidentManagement),
      reportsDashboard: Boolean(inn.permissions?.reportinganddashboard),
      // No ticket module exists on the backend.
      ticketManagement: false,
    },
  };
  usersById.set(user.id, user);
  return user;
};

const mapAttachment = (raw: Raw): Attachment => ({
  // Sub-documents expose `_id`; the upload/list endpoints return `id`.
  id: idOf(raw),
  name: text(raw.originalName),
  size: Number(raw.size) || 0,
  type: text(raw.mimeType) || 'application/octet-stream',
  url: '',
  uploadedAt: isoOf(raw.uploadedAt),
  uploadedBy: text(raw.uploadedByName),
});

const mapActivity = (raw: Raw): ActivityEntry => ({
  id:
    idOf(raw) ||
    `${text(raw.performedAt)}-${text(raw.description)}-${text(raw.performedByName)}`,
  text: text(raw.description),
  createdAt: isoOf(raw.performedAt),
  authorId: idOf(raw.performedById),
  authorName: text(raw.performedByName),
});

const mapComment = (
  raw: Raw,
  entityType: Comment['entityType'],
  entityId: string,
): Comment => {
  const authorId = idOf(raw.authorId);
  return {
    id:
      idOf(raw) ||
      `${entityId}-${text(raw.commentedAt)}-${text(raw.authorName)}`,
    entityType,
    entityId,
    authorId,
    authorName: text(raw.authorName),
    authorRole: usersById.get(authorId)?.role ?? '',
    text: text(raw.comment),
    createdAt: isoOf(raw.commentedAt),
  };
};

const mapParent = (raw: Raw, progress = 0): ParentTask => {
  rememberParent(raw);
  const owner = raw?.assignedTo;
  const ownerId = idOf(owner);
  const createdBy = raw?.createdBy;
  return {
    id: text(raw?.taskNumber) || idOf(raw),
    title: text(raw?.title),
    description: text(raw?.description),
    assetCategory: text(raw?.assetCategory),
    assetClass: text(raw?.assetClass),
    assetSubType: text(raw?.assetSubType),
    location: text(raw?.location),
    startDate: dayOf(raw?.startDate),
    endDate: dayOf(raw?.endDate),
    dueDate: dayOf(raw?.dueDate),
    severity: (raw?.severity ?? 'Medium') as Severity,
    priority: (raw?.priority ?? 'Medium') as Priority,
    purpose: (raw?.purpose ?? '') as TaskPurpose,
    status: (raw?.status ?? 'New') as TaskStatus,
    ownerId,
    ownerName:
      text(owner?.employeeName) ||
      usersById.get(ownerId)?.employeeName ||
      (ownerId ? '' : 'Unassigned'),
    createdAt: isoOf(raw?.createdAt),
    updatedAt: isoOf(raw?.updatedAt ?? raw?.createdAt),
    progress: Math.max(0, Math.min(100, Math.round(Number(progress) || 0))),
  };
};

const mapChild = (raw: Raw): ChildTask => {
  rememberChild(raw);
  const parentRef = raw?.parentTaskId;
  const linkedRef = raw?.linkedChildTaskId;
  const assignee = raw?.assignedTo;
  const assignToId = idOf(assignee);
  return {
    id: text(raw?.taskNumber) || idOf(raw),
    title: text(raw?.title),
    taskType: text(raw?.taskType),
    parentTaskId:
      (parentRef && typeof parentRef === 'object'
        ? text(parentRef.taskNumber)
        : '') || idOf(parentRef),
    linkedChildTaskId: linkedRef
      ? (typeof linkedRef === 'object'
          ? text(linkedRef.taskNumber)
          : '') || idOf(linkedRef)
      : null,
    assignToId,
    assignToName:
      text(assignee?.employeeName) ||
      usersById.get(assignToId)?.employeeName ||
      '',
    status: (raw?.status ?? 'New') as TaskStatus,
    activities: (raw?.activities ?? []).map(mapActivity),
    startDate: '',
    endDate: raw?.endDate ? dayOf(raw.endDate) : raw?.dueDate ? dayOf(raw.dueDate) : undefined,
    createdAt: isoOf(raw?.createdAt),
    updatedAt: isoOf(raw?.updatedAt ?? raw?.createdAt),
    attachments: (raw?.attachments ?? []).map(mapAttachment),
  };
};

const mapBudget = (raw: Raw, parentTaskId = ''): BudgetEntry => {
  const createdById = idOf(raw?.createdBy);
  return {
    id: text(raw?.budgetNumber) || idOf(raw),
    parentTaskId,
    title: text(raw?.title),
    description: text(raw?.description),
    amount: Number(raw?.estimatedCost ?? raw?.actualCost ?? 0),
    attachments: (raw?.attachments ?? []).map(mapAttachment),
    createdAt: isoOf(raw?.createdAt),
    createdBy: createdById,
    createdByName: usersById.get(createdById)?.employeeName ?? '',
  };
};

const mapProject = (raw: Raw): Project => ({
  id: idOf(raw),
  code: text(raw?.code),
  name: text(raw?.name),
  active: raw?.isActive !== false,
});

const mapCostCenter = (raw: Raw): CostCenter => ({
  id: idOf(raw),
  code: text(raw?.code),
  name: text(raw?.name),
  active: raw?.isActive !== false,
});

const mapMapping = (raw: Raw): Mapping => ({
  id: idOf(raw),
  projectId: idOf(raw?.projectId),
  projectName: text(raw?.projectId?.name),
  costCenterId: idOf(raw?.costCenterId),
  costCenterName: text(raw?.costCenterId?.name),
  allocationPct: Number(raw?.allocationPercentage) || 0,
  effectiveStart: dayOf(raw?.effectiveStartDate),
  effectiveEnd: dayOf(raw?.effectiveEndDate),
});

const paginate = <T>(items: T[], params: Raw = {}) => {
  const total = items.length;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  return {
    data: items.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
  };
};

type ProgressEntry = { total: number; done: number };

/**
 * The parent-task list response carries no progress, so it is derived from the
 * child tasks of each parent — the same rule the mock and the detail endpoint
 * use. A failed lookup degrades to 0% instead of breaking the list.
 *
 * Managers receive every child task from the child list, so one paged sweep
 * feeds the whole page instead of one request per parent. Technical members
 * only receive the child tasks assigned to them there, so for them progress is
 * resolved per parent — and memoised, as their parent list only contains tasks
 * they already own.
 */
let taskMetaPromise: Promise<TaskMeta> | null = null;
let childIndexPromise: Promise<Map<string, ProgressEntry>> | null = null;
const progressByParent = new Map<string, Promise<number>>();

function invalidateProgress(): void {
  childIndexPromise = null;
  progressByParent.clear();
}

function percentageOf(entry?: ProgressEntry): number {
  if (!entry || !entry.total) return 0;
  return Math.round((entry.done / entry.total) * 100);
}

async function loadChildIndex(): Promise<Map<string, ProgressEntry>> {
  const index = new Map<string, ProgressEntry>();
  for (let page = 1; page <= 50; page += 1) {
    const res = await http.get<{ items: Raw[]; total?: number }>('/tasks/child', {
      page,
      limit: 100,
    });
    const items = res?.items ?? [];
    items.forEach((raw) => {
      const ref = raw?.parentTaskId;
      const key =
        (ref && typeof ref === 'object' ? text(ref.taskNumber) : text(ref)) ||
        '';
      if (!key) return;
      const entry = index.get(key) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (raw?.status === 'Completed' || raw?.status === 'Closed') entry.done += 1;
      index.set(key, entry);
    });
    const total = Number(res?.total ?? items.length);
    if (!items.length || page * 100 >= total) break;
  }
  return index;
}

function childIndex(): Promise<Map<string, ProgressEntry>> {
  if (!childIndexPromise) {
    childIndexPromise = loadChildIndex().catch(() => {
      childIndexPromise = null; // a later render may retry
      return new Map<string, ProgressEntry>();
    });
  }
  return childIndexPromise;
}

async function parentProgress(task: ParentTask): Promise<number> {
  if (managerScope) {
    return percentageOf((await childIndex()).get(task.id));
  }
  const cached = progressByParent.get(task.id);
  if (cached) return cached;
  const pending = (async () => {
    const mongoId = isObjectId(task.id)
      ? task.id
      : parentIdsByNumber.get(task.id);
    if (!mongoId) return 0;
    try {
      const res = await http.get<{ items: Raw[] }>('/tasks/child', {
        parentTaskId: mongoId,
        page: 1,
        limit: 100,
      });
      const children = res?.items ?? [];
      const done = children.filter(
        (c) => c.status === 'Completed' || c.status === 'Closed',
      ).length;
      return percentageOf({ total: children.length, done });
    } catch {
      return 0;
    }
  })();
  progressByParent.set(task.id, pending);
  return pending;
}

/* ------------------------------------------------------------------ *
 * Adapter
 * ------------------------------------------------------------------ */
export const backendApi = {
  /* ---------------------------------------------------------------- auth */
  async login(loginId: string, password: string) {
    const res = await http.post<Raw>('/auth/login', { loginId, password });
    if (res?.refreshToken) localStorage.setItem('ema_refresh', res.refreshToken);
    const user = mapUser(res?.user);
    return {
      token: text(res?.accessToken),
      refreshToken: text(res?.refreshToken),
      user,
      // Expiry needs `passwordChangedAt`, which the backend does not return.
      passwordExpired: false,
    };
  },

  async logout() {
    try {
      await http.post<void>('/auth/logout');
    } finally {
      localStorage.removeItem('ema_refresh');
    }
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    // Self-service password change is served by the users module.
    await http.put<void>(`/users/${userId}/password`, {
      currentPassword: oldPassword,
      newPassword,
    });
    return { message: 'Password changed successfully' };
  },

  /* -------------------------------------------------------- task dropdowns */
  /** Enum options are static, so the first caller's request is shared. */
  getTaskMeta(): Promise<TaskMeta> {
    if (!taskMetaPromise) {
      taskMetaPromise = http.get<TaskMeta>('/tasks/meta').catch((err) => {
        taskMetaPromise = null; // allow a retry after a failure
        throw err;
      });
    }
    return taskMetaPromise;
  },

  /* ------------------------------------------------------- parent tasks */
  async listParents(params: Raw = {}) {
    // Decides whether progress can be derived from a single child-task sweep.
    await hydrateUsersOnce();
    const query: Raw = { page: 1, limit: 100 };
    if (hasValue(params.status)) query.status = params.status;
    const res = await http.get<{ items: Raw[] }>('/tasks/parent', query);

    let items = (res?.items ?? []).map((raw) => mapParent(raw));
    if (params.q) {
      const q = String(params.q).toLowerCase();
      items = items.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.assetCategory.toLowerCase().includes(q),
      );
    }
    if (params.priority) items = items.filter((p) => p.priority === params.priority);
    if (params.severity) items = items.filter((p) => p.severity === params.severity);
    if (params.location) items = items.filter((p) => p.location === params.location);

    const sortBy = params.sortBy ?? 'dueDate';
    const dir = params.sortDir === 'asc' ? 1 : -1;
    items.sort((a: any, b: any) => {
      const av = a[sortBy] ?? '';
      const bv = b[sortBy] ?? '';
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * dir;
    });

    const paged = paginate(items, params);
    const progress = await Promise.all(
      paged.data.map((task) => parentProgress(task)),
    );
    paged.data.forEach((task, i) => {
      task.progress = progress[i];
    });
    return paged;
  },

  async getParent(id: string) {
    const mongoId = await resolveParentId(id);
    const res = await http.get<Raw>(`/tasks/parent/${mongoId}`);
    return mapParent(res?.task, res?.progress?.completionPercentage ?? 0);
  },

  async createParent(payload: Raw) {
    const body: Raw = {};
    ['title', 'description'].forEach((k) => assignIf(body, k, payload?.[k]));
    ['assetCategory', 'assetClass', 'assetSubType', 'location'].forEach((k) =>
      assignIf(body, k, payload?.[k]),
    );
    ['startDate', 'endDate', 'dueDate'].forEach((k) =>
      assignIf(body, k, payload?.[k]),
    );
    ['severity', 'priority', 'purpose', 'status'].forEach((k) =>
      assignIf(body, k, payload?.[k]),
    );
    if (isObjectId(payload?.ownerId)) body.assignedTo = payload.ownerId;
    const raw = await http.post<Raw>('/tasks/parent', body);
    return mapParent(raw);
  },

  async updateParent(id: string, patch: Raw) {
    const mongoId = await resolveParentId(id);
    const body: Raw = {};
    ['title', 'description'].forEach((k) => assignIf(body, k, patch?.[k]));
    ['assetCategory', 'assetClass', 'assetSubType', 'location'].forEach((k) =>
      assignIf(body, k, patch?.[k]),
    );
    ['startDate', 'endDate', 'dueDate'].forEach((k) =>
      assignIf(body, k, patch?.[k]),
    );
    ['severity', 'priority', 'purpose', 'status'].forEach((k) =>
      assignIf(body, k, patch?.[k]),
    );
    if (isObjectId(patch?.ownerId)) body.assignedTo = patch.ownerId;
    const raw = await http.patch<Raw>(`/tasks/parent/${mongoId}`, body);
    return mapParent(raw);
  },

  /* -------------------------------------------------------- child tasks */
  async listChildren(params: Raw = {}) {
    const query: Raw = { page: 1, limit: 100 };
    if (hasValue(params.parentTaskId)) {
      query.parentTaskId = await resolveParentId(params.parentTaskId);
    }
    if (hasValue(params.status)) query.status = params.status;
    const res = await http.get<{ items: Raw[] }>('/tasks/child', query);

    let items = (res?.items ?? []).map(mapChild);
    if (params.q) {
      const q = String(params.q).toLowerCase();
      items = items.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q),
      );
    }
    if (params.assignToId) {
      items = items.filter((c) => c.assignToId === params.assignToId);
    }
    return paginate(items, params);
  },

  async getChild(id: string) {
    const mongoId = await resolveChildId(id);
    const raw = await http.get<Raw>(`/tasks/child/${mongoId}`);
    return mapChild(raw);
  },

  async createChild(payload: Raw) {
    const body: Raw = {
      parentTaskId: await resolveParentId(payload?.parentTaskId),
    };
    ['title', 'description', 'taskType', 'status'].forEach((k) =>
      assignIf(body, k, payload?.[k]),
    );
    if (isObjectId(payload?.assignToId)) body.assignedTo = payload.assignToId;
    if (hasValue(payload?.linkedChildTaskId)) {
      body.linkedChildTaskId = await resolveChildId(payload.linkedChildTaskId);
    }
    // The child task form captures a single "due / end" date.
    assignIf(body, 'endDate', payload?.endDate);
    assignIf(body, 'dueDate', payload?.endDate ?? payload?.dueDate);
    const raw = await http.post<Raw>('/tasks/child', body);
    invalidateProgress();
    return mapChild(raw);
  },

  async updateChild(id: string, patch: Raw) {
    const mongoId = await resolveChildId(id);
    const body: Raw = {};
    ['title', 'description', 'taskType', 'status'].forEach((k) =>
      assignIf(body, k, patch?.[k]),
    );
    ['endDate', 'dueDate'].forEach((k) => assignIf(body, k, patch?.[k]));
    if (hasValue(patch?.assignToId) && isObjectId(patch.assignToId)) {
      body.assignedTo = patch.assignToId;
    }
    if (hasValue(patch?.parentTaskId)) {
      body.parentTaskId = await resolveParentId(patch.parentTaskId);
    }
    if (hasValue(patch?.linkedChildTaskId)) {
      body.linkedChildTaskId = await resolveChildId(patch.linkedChildTaskId);
    }
    let raw = await http.patch<Raw>(`/tasks/child/${mongoId}`, body);

    // Activities are appended through their own endpoint (TM_09).
    const activity = String(patch?.newActivity ?? '').trim();
    if (activity) {
      await http.post<Raw>(`/tasks/child/${mongoId}/activities`, {
        description: activity,
      });
      raw = await http.get<Raw>(`/tasks/child/${mongoId}`);
    }
    invalidateProgress();
    return mapChild(raw);
  },

  /* ---------------------------------------------------------- attachments */
  async addAttachment(childId: string, file: File) {
    const mongoId = await resolveChildId(childId);
    const form = new FormData();
    form.append('files', file);
    const list = await http.post<Raw[]>(
      `/tasks/child/${mongoId}/attachments`,
      form,
    );
    const first = Array.isArray(list) ? list[0] : null;
    return mapAttachment(first ?? {});
  },

  /** Downloads with the bearer token and returns an object URL. */
  async downloadAttachment(
    kind: 'parent' | 'child' | 'budget',
    docRef: string,
    attachmentId: string,
  ) {
    const docId =
      kind === 'parent'
        ? await resolveParentId(docRef)
        : kind === 'budget'
          ? await resolveBudgetId(docRef)
          : await resolveChildId(docRef);
    const res = await apiClient.get(
      `/tasks/${kind}/${docId}/attachments/${attachmentId}/download`,
      { responseType: 'blob' },
    );
    return URL.createObjectURL(res.data as Blob);
  },

  /* ------------------------------------------------------------- comments */
  async listComments(entityType: string, entityId: string) {
    await hydrateUsersOnce();
    if (entityType === 'child') {
      const mongoId = await resolveChildId(entityId);
      const list = await http.get<Raw[]>(`/tasks/child/${mongoId}/comments`);
      return (list ?? []).map((c) => mapComment(c, 'child', entityId));
    }
    if (entityType === 'budget') {
      const parentId = await resolveParentId(entityId);
      const budgets = await http.get<Raw[]>(`/tasks/parent/${parentId}/budget`);
      return (budgets ?? []).flatMap((b) =>
        (b.comments ?? []).map((c: Raw) => mapComment(c, 'budget', entityId)),
      );
    }
    // The backend stores comment history on child tasks and budget details;
    // the parent-task thread aggregates the comments of its child tasks.
    const parentId = await resolveParentId(entityId);
    const children = await http.get<{ items: Raw[] }>('/tasks/child', {
      parentTaskId: parentId,
      page: 1,
      limit: 100,
    });
    const collected: Comment[] = [];
    for (const child of children?.items ?? []) {
      const list = await http.get<Raw[]>(
        `/tasks/child/${idOf(child)}/comments`,
      );
      (list ?? []).forEach((c) => collected.push(mapComment(c, 'parent', entityId)));
    }
    collected.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return collected;
  },

  async addComment(payload: Raw) {
    const body = String(payload?.text ?? '').trim();
    if (!body) throw new ApiRequestError('Comment cannot be empty');

    if (payload?.entityType === 'child') {
      const mongoId = await resolveChildId(payload.entityId);
      const child = await http.post<Raw>(
        `/tasks/child/${mongoId}/comments`,
        { comment: body },
      );
      const last = (child?.comments ?? []).slice(-1)[0];
      return mapComment(
        last ?? {
          comment: body,
          authorName: payload.authorName,
          commentedAt: new Date().toISOString(),
        },
        'child',
        payload.entityId,
      );
    }

    if (payload?.entityType === 'budget') {
      const budgetId = await resolveBudgetId(payload.entityId);
      const budget = await http.post<Raw>(
        `/tasks/budget/${budgetId}/comments`,
        { comment: body },
      );
      const last = (budget?.comments ?? []).slice(-1)[0];
      return mapComment(
        last ?? {
          comment: body,
          authorName: payload.authorName,
          commentedAt: new Date().toISOString(),
        },
        'budget',
        payload.entityId,
      );
    }

    throw new ApiRequestError(
      'The backend keeps comment history on child tasks and budget details — post this comment on a child task instead.',
    );
  },

  /* --------------------------------------------------------------- budget */
  async listBudgets(parentTaskId: string) {
    const parentId = await resolveParentId(parentTaskId);
    const list = await http.get<Raw[]>(`/tasks/parent/${parentId}/budget`);
    return (list ?? []).map((b) => mapBudget(b, parentTaskId));
  },

  async createBudget(payload: Raw) {
    const parentId = await resolveParentId(payload?.parentTaskId);
    const body: Raw = {};
    assignIf(body, 'title', payload?.title);
    assignIf(body, 'description', payload?.description);
    if (hasValue(payload?.amount)) body.estimatedCost = Number(payload.amount);
    body.currency = payload?.currency ?? 'INR';
    const raw = await http.post<Raw>(
      `/tasks/parent/${parentId}/budget`,
      body,
    );
    budgetIdsByParent.set(payload?.parentTaskId, idOf(raw));
    budgetIdsByParent.set(parentId, idOf(raw));
    return mapBudget(raw, payload?.parentTaskId);
  },

  /* ------------------------------------------------------------- projects */
  async listProjects() {
    const list = await http.get<Raw[]>('/projects');
    return (list ?? []).map(mapProject);
  },
  async createProject(project: Raw) {
    const raw = await http.post<Raw>('/projects', {
      code: project?.code,
      name: project?.name,
      isActive: project?.active ?? true,
    });
    return mapProject(raw);
  },
  async updateProject(id: string, patch: Raw) {
    const body: Raw = {};
    assignIf(body, 'code', patch?.code);
    assignIf(body, 'name', patch?.name);
    if (patch?.active !== undefined) body.isActive = Boolean(patch.active);
    const raw = await http.put<Raw>(`/projects/${id}`, body);
    return mapProject(raw);
  },
  async deleteProject(id: string) {
    await http.delete<void>(`/projects/${id}`);
    return true;
  },

  /* --------------------------------------------------------- cost centers */
  async listCostCenters() {
    const list = await http.get<Raw[]>('/cost-centers');
    return (list ?? []).map(mapCostCenter);
  },
  async createCostCenter(center: Raw) {
    const raw = await http.post<Raw>('/cost-centers', {
      code: center?.code,
      name: center?.name,
      isActive: center?.active ?? true,
    });
    return mapCostCenter(raw);
  },
  async updateCostCenter(id: string, patch: Raw) {
    const body: Raw = {};
    assignIf(body, 'code', patch?.code);
    assignIf(body, 'name', patch?.name);
    if (patch?.active !== undefined) body.isActive = Boolean(patch.active);
    const raw = await http.put<Raw>(`/cost-centers/${id}`, body);
    return mapCostCenter(raw);
  },
  async deleteCostCenter(id: string) {
    await http.delete<void>(`/cost-centers/${id}`);
    return true;
  },

  /* ------------------------------------------------------------- mappings */
  async listMappings() {
    const list = await http.get<Raw[]>('/mappings');
    return (list ?? []).map(mapMapping);
  },
  async createMapping(mapping: Raw) {
    const body: Raw = {
      projectId: mapping?.projectId,
      costCenterId: mapping?.costCenterId,
      allocationPercentage: Number(mapping?.allocationPct),
      effectiveStartDate: mapping?.effectiveStart,
    };
    assignIf(body, 'effectiveEndDate', mapping?.effectiveEnd);
    const raw = await http.post<Raw>('/mappings', body);
    return mapMapping(raw);
  },
  async updateMapping(id: string, patch: Raw) {
    const body: Raw = {};
    assignIf(body, 'projectId', patch?.projectId);
    assignIf(body, 'costCenterId', patch?.costCenterId);
    if (hasValue(patch?.allocationPct)) {
      body.allocationPercentage = Number(patch.allocationPct);
    }
    assignIf(body, 'effectiveStartDate', patch?.effectiveStart);
    assignIf(body, 'effectiveEndDate', patch?.effectiveEnd);
    const raw = await http.put<Raw>(`/mappings/${id}`, body);
    return mapMapping(raw);
  },
  async deleteMapping(id: string) {
    await http.delete<void>(`/mappings/${id}`);
    return true;
  },

  /* ---------------------------------------------------------------- users */
  async listUsers() {
    return fetchUsers();
  },
  async createUser(user: Raw) {
    const role: RoleType = (user?.role as RoleType) || 'Technical Team Member';
    const body: Raw = {
      employeeName: user?.employeeName,
      designation: user?.designation || 'Team Member',
      projectId: user?.projectId,
      loginId: user?.loginId,
      password: DEFAULT_PASSWORD,
      status: user?.status || 'Active',
      permissions: user?.access
        ? permissionsFromAccess(user.access)
        : permissionsFromRole(role),
    };
    assignIf(body, 'effectiveEndDate', user?.effectiveEndDate);
    const raw = await http.post<Raw>('/users', body);
    return mapUser(raw);
  },
  async updateUser(id: string, patch: Raw) {
    const body: Raw = {};
    ['employeeName', 'designation', 'loginId', 'status'].forEach((k) =>
      assignIf(body, k, patch?.[k]),
    );
    assignIf(body, 'projectId', patch?.projectId);
    assignIf(body, 'effectiveEndDate', patch?.effectiveEndDate);
    if (patch?.access) body.permissions = permissionsFromAccess(patch.access);
    else if (patch?.role) {
      body.permissions = permissionsFromRole(patch.role as RoleType);
    }
    const raw = await http.put<Raw>(`/users/${id}`, body);
    return mapUser(raw);
  },
  async deleteUser(id: string) {
    await http.delete<void>(`/users/${id}`);
    usersById.delete(id);
    return true;
  },
  async resetPassword(userId: string) {
    await http.put<Raw>(`/users/${userId}`, { password: DEFAULT_PASSWORD });
    return {
      message: `Password reset to ${DEFAULT_PASSWORD}. The user must change it on next login.`,
      password: DEFAULT_PASSWORD,
    };
  },

  getUsersSync() {
    return usersCache;
  },
};
