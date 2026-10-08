import { Box, Paper, Typography, Stack, Avatar, TextField, Button } from '@mui/material';
import { Comment } from '../types';
import { fmtDateTime } from '../utils';
import { useState } from 'react';

export function CommentThread({ comments, onAdd, canAdd=true }: { comments: Comment[], onAdd:(text:string)=>Promise<void>|void, canAdd?:boolean }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try { await onAdd(text.trim()); setText(''); } finally { setSaving(false); }
  };
  return (
    <Box>
      <Stack spacing={1.5} mb={2} maxHeight={420} sx={{ overflowY:'auto', pr:1 }}>
        {comments.length===0 ? <Typography color="text.secondary" variant="body2" sx={{ p:2, textAlign:'center', border:'1px dashed', borderColor:'divider', borderRadius:2 }}>No comments yet. Start the discussion.</Typography> :
          comments.map(c=> (
            <Paper key={c.id} sx={{ p:1.8, bgcolor:'background.paper' }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar sx={{ width:32, height:32, bgcolor:'primary.main', fontSize:14 }}>{c.authorName.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</Avatar>
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="subtitle2" fontWeight={700}>{c.authorName}</Typography>
                    <Typography variant="caption" sx={{ bgcolor:'action.hover', px:0.8, py:0.2, borderRadius:1 }}>{c.authorRole}</Typography>
                    <Typography variant="caption" color="text.secondary">{fmtDateTime(c.createdAt)}</Typography>
                  </Stack>
                  <Typography variant="body2" mt={0.6} sx={{ whiteSpace:'pre-wrap' }}>{c.text}</Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
      </Stack>
      {canAdd && (
        <Box>
          <TextField fullWidth multiline minRows={3} placeholder="Add a comment… (cannot be edited or deleted after posting)" value={text} onChange={e=>setText(e.target.value)} size="small" />
          <Stack direction="row" justifyContent="flex-end" mt={1}>
            <Button variant="contained" disabled={!text.trim() || saving} onClick={handleAdd}>{saving?'Posting…':'Post comment'}</Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">Comments are immutable and visible to all members with access.</Typography>
        </Box>
      )}
    </Box>
  );
}
