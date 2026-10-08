import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Stack, Button, Grid, TextField, MenuItem, Chip, Alert, Snackbar, Divider, Card } from '@mui/material';
import { api } from '../../api';
import { ChildTask, Comment, Attachment, ParentTask } from '../../types';
import { StatusChip } from '../../components/StatusChip';
import { fmtDateTime, fmtDate } from '../../utils';
import { useAuthStore } from '../../store/authStore';
import { CommentThread } from '../../components/CommentThread';
import { FileUploader } from '../../components/FileUploader';
import { SearchableSelect } from '../../components/SearchableSelect';

export function ChildTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s=>s.user)!;
  const [task, setTask] = useState<ChildTask|null>(null);
  const [parent, setParent] = useState<ParentTask|null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Partial<ChildTask>>({});
  const [newActivity, setNewActivity] = useState('');
  const [users, setUsers] = useState<{label:string,value:string}[]>([]);
  const [toast, setToast]=useState<string|null>(null);
  const isPM = user.role==='Project Manager' || user.role==='Operations Manager';
  const isTech = user.role==='Technical Team Member';
  const canEdit = true; // both can edit but tech limited fields

  const load = async () => {
    if (!id) return;
    const t = await api.getChild(id);
    setTask(t); setForm(t);
    if (t.parentTaskId) { try { const p:any = await api.getParent(t.parentTaskId); setParent(p); } catch {} }
    const cm = await api.listComments('child', id);
    setComments(cm);
    // `/users` is manager-only on the backend, so a technical member gets a
    // curated list: the current assignee plus the session user.
    await api.listUsers()
      .then(us=> setUsers(us.filter(u=>u.status==='Active').map(u=>({label:`${u.employeeName} (${u.designation})`, value:u.id}))))
      .catch(()=> setUsers([{ label: `${user.employeeName} (${user.designation})`, value: user.id }]));
  };
  useEffect(()=>{ load(); }, [id]);

  const handleSave = async () => {
    if (!task) return;
    // tech can update Task Owner, Status, End Date, Activities, Comments, Attachments — but we enforce UI
    const patch:any = { ...form };
    if (isTech) {
      patch.title = task.title; // prevent change
      patch.taskType = task.taskType;
      patch.parentTaskId = task.parentTaskId;
    }
    if (newActivity.trim()) { patch.newActivity = newActivity; patch.authorId = user.id; }
    await api.updateChild(task.id, patch);
    setToast('Child task updated');
    setNewActivity('');
    setEdit(false);
    load();
  };

  const addComment = async (text:string) => {
    if (!task) return;
    const c= await api.addComment({ entityType:'child', entityId: task.id, authorId:user.id, authorName:user.employeeName, authorRole:user.role, text } as any);
    setComments(prev=>[...prev, c]);
  };

  const handleFiles = async (files: File[]) => {
    if (!task) return;
    for (const f of files) {
      await api.addAttachment(task.id, f);
    }
    load();
    setToast('Attachment uploaded');
  };
  const handleRemove = (attId: string) => {
    if (!task) return;
    setTask(prev=> prev ? {...prev, attachments: prev.attachments.filter(a=>a.id!==attId)} : prev);
  };
  const handleDownload = async (a: Attachment) => {
    if (!task) return;
    try {
      const url = a.url || await api.downloadAttachment('child', task.id, a.id);
      window.open(url, '_blank');
    } catch (e:any) {
      setToast(e?.message || 'Download failed');
    }
  };

  if (!task) return <Paper sx={{p:4}}><Typography>Loading…</Typography></Paper>;

  return (
    <Box>
      <Paper sx={{ p:2, mb:2 }}>
        <Stack direction={{ xs:'column', md:'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={800}>{task.id}</Typography>
              <StatusChip status={task.status} />
              <Chip label={task.taskType} size="small" variant="outlined" />
            </Stack>
            <Typography variant="h6" fontWeight={700} mt={0.5}>{task.title}</Typography>
            <Typography variant="caption" color="text.secondary">Parent: <Button variant="text" size="small" sx={{ p:0, minWidth:0, fontSize:12 }} onClick={()=>navigate(`/tasks/parent/${task.parentTaskId}`)}>{task.parentTaskId} {parent? `— ${parent.title}`:''}</Button> • Assigned to {task.assignToName}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Button variant="outlined" onClick={()=>navigate('/tasks')}>Back</Button>
            <Button variant="contained" onClick={()=>setEdit(v=>!v)}>{edit?'Cancel':'Edit'}</Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p:2 }}>
            <Typography fontWeight={700} mb={1.5}>Details</Typography>
            {edit ? (
              <Grid container spacing={1.5}>
                <Grid item xs={12}><TextField fullWidth size="small" label="Title" value={form.title||''} onChange={e=>setForm({...form, title:e.target.value})} disabled={isTech} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Task Type" value={form.taskType||''} onChange={e=>setForm({...form, taskType:e.target.value})} disabled={isTech} /></Grid>
                <Grid item xs={12} md={6}><SearchableSelect label="Assign To (Owner)" options={users} value={form.assignToId||null} onChange={v=>setForm({...form, assignToId:v||'', assignToName: users.find(u=>u.value===v)?.label.split(' (')[0]||''})} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth select size="small" label="Status" value={form.status||'New'} onChange={e=>setForm({...form, status:e.target.value as any})} >{['New','In Progress','Blocked','On Hold','Completed'].map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth type="date" size="small" label="End Date" InputLabelProps={{shrink:true}} value={(form as any).endDate||''} onChange={e=>setForm({...form, endDate:e.target.value as any})} /></Grid>
                <Grid item xs={12}>
                  <TextField fullWidth multiline minRows={3} label="Activities Performed — add new entry (timestamped)" value={newActivity} onChange={e=>setNewActivity(e.target.value)} placeholder="Describe what was done…" helperText="Will be appended with timestamp and your name" />
                </Grid>
                {!!task.activities.length && (
                  <Grid item xs={12}>
                    <Typography variant="caption" fontWeight={700}>Activity history</Typography>
                    <Stack spacing={1} mt={1}>
                      {task.activities.map(a=> <Paper key={a.id} variant="outlined" sx={{ p:1.2 }}><Typography variant="body2">{a.text}</Typography><Typography variant="caption" color="text.secondary">{a.authorName} • {fmtDateTime(a.createdAt)}</Typography></Paper>)}
                    </Stack>
                  </Grid>
                )}
                <Grid item xs={12}><Stack direction="row" justifyContent="flex-end" spacing={1}><Button onClick={()=>setEdit(false)}>Cancel</Button><Button variant="contained" onClick={handleSave}>Save changes</Button></Stack></Grid>
              </Grid>
            ) : (
              <Stack spacing={1.2}>
                {[
                  ['Title', task.title],
                  ['Task Type', task.taskType],
                  ['Parent Task', task.parentTaskId],
                  ['Linked Child', task.linkedChildTaskId || '—'],
                  ['Assigned To', task.assignToName],
                  ['Status', task.status],
                  ['End Date', (task as any).endDate ? fmtDate((task as any).endDate) : '—'],
                ].map(([k,v])=> (
                  <Box key={k} sx={{ display:'flex', justifyContent:'space-between', py:0.6, borderBottom:'1px solid', borderColor:'divider' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{k}</Typography>
                    <Typography variant="body2" fontWeight={500}>{v}</Typography>
                  </Box>
                ))}
                {!!task.activities.length && (
                  <Box mt={1}>
                    <Typography variant="caption" fontWeight={700}>Activities Performed</Typography>
                    <Stack spacing={1} mt={1}>
                      {task.activities.map(a=> <Paper key={a.id} variant="outlined" sx={{ p:1.2, bgcolor:'action.hover' }}><Typography variant="body2">{a.text}</Typography><Typography variant="caption" color="text.secondary">{a.authorName} • {fmtDateTime(a.createdAt)}</Typography></Paper>)}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
          </Paper>

          <Paper sx={{ p:2, mt:2 }}>
            <Typography fontWeight={700} mb={1}>Attachments</Typography>
            <FileUploader attachments={task.attachments} onAdd={handleFiles} onRemove={handleRemove} onDownload={handleDownload} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p:2 }}>
            <Typography fontWeight={700} mb={1}>Comments — thread</Typography>
            <Typography variant="caption" color="text.secondary">Chat-style history. Comments cannot be edited or deleted.</Typography>
            <Box mt={2}>
              <CommentThread comments={comments} onAdd={addComment} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
      <Snackbar open={!!toast} autoHideDuration={2500} onClose={()=>setToast(null)} message={toast||''} />
    </Box>
  );
}
