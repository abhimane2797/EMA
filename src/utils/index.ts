import { format, differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';

export const fmtDate = (iso?: string | null) => {
  if (!iso) return '-';
  try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return iso; }
};
export const fmtDateTime = (iso?: string) => {
  if (!iso) return '-';
  try { return format(parseISO(iso), 'dd MMM yyyy, hh:mm a'); } catch { return iso; }
};

export const isPasswordExpired = (changedAt: string, days = 90) => {
  try { return differenceInDays(new Date(), parseISO(changedAt)) > days; } catch { return false; }
};

export const genId = (prefix: string, n: number, pad=4) => `${prefix}-${String(n).padStart(pad,'0')}`;

export const statusColor = (s: string) => {
  switch (s) {
    case 'New': return 'default';
    case 'In Progress': return 'info';
    case 'On Hold': return 'warning';
    case 'Blocked': return 'error';
    case 'Completed': return 'success';
    default: return 'default';
  }
};

export const priorityColor = (p: string) => {
  if (p==='P1') return 'error';
  if (p==='P2') return 'warning';
  if (p==='P3') return 'info';
  return 'default';
};

export const severityColor = (sev: string) => {
  if (sev==='Critical') return 'error';
  if (sev==='High') return 'warning';
  if (sev==='Medium') return 'info';
  return 'default';
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
};

export const fileValidation = (file: File, allowed: string[], maxMB: number) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const okType = allowed.includes(ext) || allowed.includes(file.type);
  if (!okType) return `File type .${ext} not allowed`;
  if (file.size > maxMB*1024*1024) return `File exceeds ${maxMB} MB`;
  return null;
};

export const validateAllocationTotal = (mappings: {costCenterId: string, allocationPct:number}[]) => {
  const byCC: Record<string, number> = {};
  mappings.forEach(m=> byCC[m.costCenterId] = (byCC[m.costCenterId]||0)+ m.allocationPct);
  return byCC;
};

export const overlaps = (aStart:string, aEnd:string, bStart:string, bEnd:string) => {
  try {
    const aS=parseISO(aStart).getTime(), aE=parseISO(aEnd).getTime(), bS=parseISO(bStart).getTime(), bE=parseISO(bEnd).getTime();
    return aS <= bE && bS <= aE;
  } catch { return false; }
}
