import { Ticket } from './types';
import { useAuthStore } from '../../store/authStore';

/**
 * Role rules:
 * - Operations Manager: full access, all projects, configures ticket settings.
 * - Project Manager: create/edit/assign/prioritise, any status incl. close & reopen, sprints, reports.
 * - Technical Team Member: create, view own project, edit tickets assigned to them
 *   (status, comments, time logged, attachments) — never delete / priority / reporter.
 */
export function useTicketPermissions() {
  const user = useAuthStore(s => s.user);
  const role = user?.role;
  const isOM = role === 'Operations Manager';
  const isPM = role === 'Project Manager';
  const isTech = role === 'Technical Team Member';

  const isAssigned = (t?: Ticket | null) => !!t && !!user && t.assigneeId === user.id;
  const isReporter = (t?: Ticket | null) => !!t && !!user && t.reporterId === user.id;

  return {
    user,
    role,
    isOM,
    isPM,
    isTech,
    canCreate: true,
    /** open / close / reopen any ticket */
    canCloseReopen: isPM || isOM,
    canChangeStatus: (t?: Ticket | null) => isPM || isOM || (isTech && isAssigned(t)),
    canEdit: (t?: Ticket | null) => isPM || isOM || (isTech && isAssigned(t)),
    canEditCore: isPM || isOM,          // priority, reporter, dates, estimates
    canAssign: isPM || isOM,
    canDelete: isPM || isOM,
    canBulk: isPM || isOM,
    canManageSprints: isPM || isOM,
    canViewReports: isPM || isOM,
    canConfigure: isOM,
    canComment: true,
    canLogTime: (t?: Ticket | null) => isPM || isOM || (isTech && isAssigned(t)),
    canClone: true,
    canWatch: true,
    isAssigned,
    isReporter,
  };
}

export type TicketPermissions = ReturnType<typeof useTicketPermissions>;
