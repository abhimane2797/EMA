export type RoleType = 'Operations Manager' | 'Project Manager' | 'Technical Team Member';

export type ModuleKey = 'projectManagement' | 'taskManagement' | 'assetManagement' | 'incidentManagement' | 'ticketManagement' | 'reportsDashboard';

export type AccessFlags = Record<ModuleKey, boolean>;

export interface User {
  id: string;
  loginId: string;
  employeeName: string;
  designation: string;
  role: RoleType;
  projectId: string;
  projectName: string;
  status: 'Active' | 'Inactive';
  createdAt: string; // ISO
  effectiveEndDate?: string | null;
  passwordChangedAt: string; // ISO
  access: AccessFlags;
  avatar?: string;
  email?: string;
}

export type TaskStatus = 'New' | 'In Progress' | 'On Hold' | 'Blocked' | 'Completed' | 'Closed' | 'Cancelled';
export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
/** Priority uses the same value set the backend validates (GET /tasks/meta). */
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskPurpose = 'New Setup' | 'Replacement' | 'Maintenance' | 'Enhancement' | 'Support' | 'Compliance' | 'Other';

/** Dropdown option lists served by GET /tasks/meta (see master_backend config/task-options.ts). */
export interface TaskMeta {
  assetCategories: string[];
  assetClasses: string[];
  assetSubTypes: string[];
  locations: string[];
  purposes: string[];
  taskTypes: string[];
  statuses: string[];
  severities: string[];
  priorities: string[];
}

export interface ParentTask {
  id: string; // TSK-0001
  title: string;
  description: string;
  assetCategory: string;
  assetClass: string;
  assetSubType: string;
  location: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  severity: Severity;
  priority: Priority;
  purpose: TaskPurpose;
  status: TaskStatus;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  progress: number; // 0-100 derived from child tasks
}

export interface ChildTask {
  id: string; // CTSK-*
  title: string;
  taskType: string;
  parentTaskId: string;
  linkedChildTaskId?: string | null;
  assignToId: string;
  assignToName: string;
  status: TaskStatus;
  activities: ActivityEntry[];
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export interface ActivityEntry {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

export interface Comment {
  id: string;
  entityType: 'parent' | 'child' | 'budget';
  entityId: string;
  authorId: string;
  authorName: string;
  authorRole: RoleType | '';
  text: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface BudgetEntry {
  id: string; // BDG-*
  parentTaskId: string;
  title: string;
  description: string;
  amount: number;
  attachments: Attachment[];
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface Mapping {
  id: string;
  projectId: string;
  projectName: string;
  costCenterId: string;
  costCenterName: string;
  allocationPct: number;
  effectiveStart: string;
  effectiveEnd: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  passwordExpired?: boolean;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  fieldErrors?: Record<string, string>;
}
