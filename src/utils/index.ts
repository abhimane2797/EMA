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
    // Ticket workflow
    case 'Backlog': return 'default';
    case 'To Do': return 'default';
    case 'In Review': return 'secondary';
    case 'Testing': return 'warning';
    case 'Done': return 'success';
    case 'Reopened': return 'warning';
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

export const buildCSV = (rows: Record<string, any>[], columns?: string[]) => {
  if (!rows.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
};

export const downloadCSV = (rows: Record<string, any>[], filename: string, columns?: string[]) => {
  downloadBlob(new Blob([buildCSV(rows, columns)], { type: 'text/csv;charset=utf-8;' }), filename);
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
