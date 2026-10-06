import React from 'react';
import { Box } from '@mui/material';
import { formatDistanceToNow, parseISO } from 'date-fns';

export const EDIT_WINDOW_MIN = 15;

/** Comments can be edited by their author for 15 minutes after posting. */
export const canEditComment = (comment: { authorId: string; createdAt: string }, userId?: string | null) => {
  if (!userId || comment.authorId !== userId) return false;
  return Date.now() - new Date(comment.createdAt).getTime() <= EDIT_WINDOW_MIN * 60 * 1000;
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const parseMentions = (body: string, users: { id: string; name: string }[]): string[] =>
  users.filter(u => body.includes(`@${u.name}`)).map(u => u.id);

/** Highlights every `@Full Name` that matches a known user. */
export function renderMentions(body: string, users: { id: string; name: string }[]): React.ReactNode[] {
  const names = users.map(u => u.name).sort((a, b) => b.length - a.length);
  if (!names.length) return [body];
  const re = new RegExp(`@(${names.map(escapeRe).join('|')})`, 'g');
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(body))) {
    if (m.index > last) out.push(body.slice(last, m.index));
    out.push(
      <Box key={`m${i++}`} component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
        {m[0]}
      </Box>,
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

export const relTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); } catch { return iso; }
};

export const dayRange = (from: Date, to: Date) => ({
  from: from.toISOString().slice(0, 10),
  to: to.toISOString().slice(0, 10),
});

export const pct = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
