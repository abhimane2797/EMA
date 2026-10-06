import { useMemo, useState } from 'react';
import {
  Avatar, Box, Button, Chip, List, ListItemButton, ListItemText, Paper, Popper, Stack,
  TextField, Typography,
} from '@mui/material';
import { Edit, Save, AlternateEmail, Cancel } from '@mui/icons-material';
import { TicketComment } from '../types';
import { fmtDateTime } from '../../../utils';
import { canEditComment, parseMentions } from '../utils';
import { useAuthStore } from '../../../store/authStore';
import { Markdown } from './Markdown';
import { useAddComment, useEditComment } from '../api/queries';

interface UserLite { id: string; name: string }

export function TicketComments({
  ticketKey, comments, users, canComment = true,
}: {
  ticketKey: string;
  comments: TicketComment[];
  users: UserLite[];
  canComment?: boolean;
}) {
  const user = useAuthStore(s => s.user);
  const addComment = useAddComment();
  const editComment = useEditComment();
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...comments].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [comments],
  );

  const detectMention = (value: string) => {
    const match = value.match(/(?:^|\s)@([A-Za-z ]*)$/);
    if (match) { setMentionQuery(match[1].toLowerCase()); setAnchorEl(document.activeElement as HTMLElement); }
    else { setMentionQuery(null); setAnchorEl(null); }
  };

  const applyMention = (name: string) => {
    setText(prev => {
      const idx = prev.lastIndexOf('@');
      return `${prev.slice(0, idx)}@${name} `;
    });
    setMentionQuery(null);
    setAnchorEl(null);
  };

  const mentionOptions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.trim().toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q)).slice(0, 6);
  }, [mentionQuery, users]);

  const post = async () => {
    if (!text.trim()) return;
    await addComment.mutateAsync({ key: ticketKey, body: text.trim(), mentions: parseMentions(text, users) });
    setText('');
    setAnchorEl(null);
    setMentionQuery(null);
  };

  const saveEdit = async (c: TicketComment) => {
    await editComment.mutateAsync({ key: ticketKey, commentId: c.id, body: draft });
    setEditingId(null);
  };

  return (
    <Box>
      <List disablePadding>
        {sorted.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
            No comments yet. Start the discussion.
          </Typography>
        )}
        {sorted.map(c => {
          const editable = canEditComment(c, user?.id);
          return (
            <Paper key={c.id} sx={{ p: 1.5, mb: 1.5, bgcolor: 'background.paper' }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
                  {c.authorName.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                </Avatar>
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2" fontWeight={700}>{c.authorName}</Typography>
                    <Chip size="small" label={c.authorRole} sx={{ height: 18, fontSize: 10 }} />
                    <Typography variant="caption" color="text.secondary">
                      {fmtDateTime(c.createdAt)}
                      {c.editedAt && ' · edited'}
                    </Typography>
                    <Box flex={1} />
                    {editable && (
                      <Button
                        size="small"
                        startIcon={<Edit sx={{ fontSize: 14 }} />}
                        onClick={() => { setEditingId(c.id); setDraft(c.body); }}
                        sx={{ minWidth: 0, textTransform: 'none', fontSize: 12 }}
                      >
                        Edit
                      </Button>
                    )}
                  </Stack>

                  {editingId === c.id ? (
                    <Stack spacing={1} mt={1}>
                      <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={3}
                        size="small"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        inputProps={{ 'aria-label': 'Edit comment' }}
                      />
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" startIcon={<Cancel />} onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button size="small" variant="contained" startIcon={<Save />} disabled={!draft.trim()} onClick={() => saveEdit(c)}>Save</Button>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Editable for 15 minutes after posting.
                      </Typography>
                    </Stack>
                  ) : (
                    <Box mt={0.5} sx={{ '& p': { my: 0.5 } }}>
                      <Markdown>{c.body}</Markdown>
                      {c.edits.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          Original: “{c.edits[c.edits.length - 1].body.slice(0, 80)}…”
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </List>

      {canComment && (
        <Box mt={1}>
          <TextField
            fullWidth
            multiline
            minRows={3}
            size="small"
            placeholder="Add a comment… use @ to mention a teammate"
            value={text}
            onChange={e => { setText(e.target.value); detectMention(e.target.value); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); }
            }}
            inputProps={{ 'aria-label': 'Add a comment' }}
          />
          <Popper open={mentionOptions.length > 0} anchorEl={anchorEl} placement="bottom-start" sx={{ zIndex: 1300 }}>
            <Paper elevation={6} sx={{ mt: 0.5, width: 260 }}>
              <List dense disablePadding>
                {mentionOptions.map(o => (
                  <ListItemButton key={o.id} onMouseDown={e => { e.preventDefault(); applyMention(o.name); }}>
                    <ListItemText primary={o.name} secondary={`@${o.name.split(' ')[0].toLowerCase()}`} />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Popper>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" mt={1}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AlternateEmail sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">Ctrl+Enter to post · @mentions notify</Typography>
            </Stack>
            <Button variant="contained" size="small" disabled={!text.trim() || addComment.isPending} onClick={post}>
              {addComment.isPending ? 'Posting…' : 'Post comment'}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
