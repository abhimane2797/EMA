import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Stack, Button, Grid, Chip, Tabs, Tab, Divider, TextField, MenuItem, Alert, Snackbar, LinearProgress, Card, CardContent } from '@mui/material';
import { mockApi } from '../../api/mockApi';
import { ParentTask, ChildTask, Comment, BudgetEntry } from '../../types';
import { StatusChip } from '../../components/StatusChip';
import { fmtDate, fmtDateTime } from '../../utils';
import { useAuthStore } from '../../store/authStore';
import { CommentThread } from '../../components/CommentThread';
import { FileUploader } from '../../components/FileUploader';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';

function TabPanel({ children, value, index }: any) { return <Box hidden={value!==index} sx={{ pt:2 }}>{value===index && children}</Box>; }

export function ParentTaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s=>s.user)!;
  const isPM = user.role==='Project Manager' || user.role==='Operations Manager';
  const isTech = user.role==='Technical Team Member';
  const [task, setTask] = useState<ParentTask|null>(null);
  const [children, setChildren] = useState<ChildTask[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [budgets, setBudgets] = useState<BudgetEntry[]>([]);
  const [tab, setTab] = useState(0);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Partial<ParentTask>>({});
  const [toast, setToast] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const p = await mockApi.getParent(id);
      setTask(p); setForm(p);
      const ch = await mockApi.listChildren({ parentTaskId: id, page:1, pageSize:100 });
      setChildren(ch.data);
      const cm = await mockApi.listComments('parent', id);
      setComments(cm);
      const bg = await mockApi.listBudgets(id);
      setBudgets(bg);
    } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); }, [id]);

  const handleSave = async () => {
    if (!task) return;
    // enforce tech restrictions
    let patch: any = {};
    if (isTech) {
      patch = { status: form.status, endDate: form.endDate };
    } else {
      patch = form;
      // validate dates
      if (patch.startDate && patch.endDate && patch.startDate > patch.endDate) { setToast('Start must be ≤ End'); return; }
      if (patch.endDate && patch.dueDate && patch.endDate > patch.dueDate) { setToast('End must be ≤ Due'); return; }
    }
    await mockApi.updateParent(task.id, patch);
    setToast('Parent task updated');
    setEdit(false);
    load();
  };

  const addComment = async (text:string) => {
    if (!task) return;
    const c = await mockApi.addComment({ entityType:'parent', entityId: task.id, authorId: user.id, authorName: user.employeeName, authorRole: user.role, text });
    setComments(prev=> [...prev, c]);
  };

  if (loading) return <Paper sx={{ p:4 }}><LinearProgress /></Paper>;
  if (!task) return <Paper sx={{ p:4 }}><Typography>Task not found</Typography><Button onClick={()=>navigate('/tasks')}>Back</Button></Paper>;

  const statusCounts = ['New','In Progress','Blocked','Completed','On Hold'].map(s=> ({ name:s, value: children.filter(c=>c.status===s).length, color: ({'New':'#9CA3AF','In Progress':'#2563EB','Blocked':'#DC2626','Completed':'#059669','On Hold':'#D97706'} as any)[s] })).filter(x=>x.value>0);
  const totalBudget = budgets.reduce((a,b)=> a + b.amount, 0);

  return (
    <Box>
      <Paper sx={{ p:2, mb:2 }}>
        <Stack direction={{ xs:'column', md:'row' }} justifyContent="space-between" spacing={2} alignItems={{ md:'center' }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={800}>{task.id}</Typography>
              <StatusChip status={task.status} />
              <Chip label={`${task.progress}%`} size="small" color="primary" variant="outlined" />
            </Stack>
            <Typography variant="h6" fontWeight={700} mt={0.5}>{task.title}</Typography>
            <Typography variant="caption" color="text.secondary">{task.assetCategory} • {task.assetClass} • {task.location} • Owner: {task.ownerName}</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={()=>navigate('/tasks')}>Back to list</Button>
            <Button variant="contained" onClick={()=> setEdit(v=>!v)}>{edit?'Cancel edit':'Edit'}</Button>
          </Stack>
        </Stack>
        {edit && isTech && <Alert severity="info" sx={{ mt:2, fontSize:13 }}>As Technical Member you can only edit Status and End Date. Other fields are read-only.</Alert>}
      </Paper>

      {edit ? (
        <Paper sx={{ p:3, mb:2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Title" value={form.title||''} onChange={e=>setForm({...form, title:e.target.value})} disabled={isTech} size="small" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Description" multiline minRows={3} value={form.description||''} onChange={e=>setForm({...form, description:e.target.value})} disabled={isTech} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth label="Asset Category" value={form.assetCategory||''} onChange={e=>setForm({...form, assetCategory:e.target.value})} disabled={isTech} size="small" /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth label="Location" value={form.location||''} onChange={e=>setForm({...form, location:e.target.value})} disabled={isTech} size="small" /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Start Date" InputLabelProps={{shrink:true}} value={form.startDate||''} onChange={e=>setForm({...form, startDate:e.target.value})} disabled={isTech} size="small" /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="End Date" InputLabelProps={{shrink:true}} value={form.endDate||''} onChange={e=>setForm({...form, endDate:e.target.value})} size="small" /></Grid>
            <Grid item xs={12} md={2}><TextField fullWidth type="date" label="Due Date" InputLabelProps={{shrink:true}} value={form.dueDate||''} onChange={e=>setForm({...form, dueDate:e.target.value})} disabled={isTech} size="small" /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth select label="Status" value={form.status||'New'} onChange={e=>setForm({...form, status:e.target.value as any})} size="small">{['New','In Progress','On Hold','Blocked','Completed'].map(s=> <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
            <Grid item xs={12}><Stack direction="row" justifyContent="flex-end" spacing={1}><Button onClick={()=>setEdit(false)}>Cancel</Button><Button variant="contained" onClick={handleSave}>Save changes</Button></Stack></Grid>
          </Grid>
        </Paper>
      ) : (
        <Paper sx={{ p:3, mb:2 }}>
          <Grid container spacing={2}>
            {[
              ['Description', task.description],
              ['Asset', `${task.assetCategory} / ${task.assetClass} ${task.assetSubType? '/ '+task.assetSubType : ''}`],
              ['Location', task.location],
              ['Dates', `${fmtDate(task.startDate)} → ${fmtDate(task.endDate)} (Due ${fmtDate(task.dueDate)})`],
              ['Severity / Priority / Purpose', `${task.severity} • ${task.priority} • ${task.purpose}`],
              ['Progress', `${task.progress}% • ${children.length} child tasks`],
            ].map(([k,v])=> (
              <Grid key={k} item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{k}</Typography>
                <Typography variant="body2" mt={0.3}>{v}</Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      <Paper sx={{ px:2 }}>
        <Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab label={`Details & Comments (${comments.length})`} />
          <Tab label={`Child Tasks (${children.length})`} />
          <Tab label={`Budget / Cost (${budgets.length})`} />
          <Tab label="Progress" />
        </Tabs>
        <Divider />

        <TabPanel value={tab} index={0}>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Comments</Typography>
          <CommentThread comments={comments} onAdd={addComment} />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" fontWeight={700}>Child tasks for {task.id}</Typography>
            <Button variant="contained" onClick={()=> navigate(`/tasks/child/new?parent=${task.id}`)}>Add Child Task</Button>
          </Stack>
          {children.length===0 ? <Alert severity="info">No child tasks yet. Click "Add Child Task" to create one.</Alert> : (
            <Grid container spacing={1.5}>
              {children.map(c=> (
                <Grid key={c.id} item xs={12} md={6}>
                  <Card variant="outlined" sx={{ borderRadius:2, cursor:'pointer' }} onClick={()=> navigate(`/tasks/child/${c.id}`)}>
                    <CardContent sx={{ p:2 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" fontWeight={700} color="primary.main">{c.id}</Typography>
                        <StatusChip status={c.status} />
                      </Stack>
                      <Typography variant="body2" fontWeight={600} mt={0.5} noWrap>{c.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.taskType} • Assigned to {c.assignToName} {c.linkedChildTaskId? `• Linked: ${c.linkedChildTaskId}`:''}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <BudgetTab parentTaskId={task.id} budgets={budgets} onRefresh={load} canEdit={isPM} />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <ProgressTab children={children} parent={task} />
        </TabPanel>
      </Paper>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={()=>setToast(null)} message={toast||''} />
    </Box>
  );
}

function BudgetTab({ parentTaskId, budgets, onRefresh, canEdit }: { parentTaskId:string, budgets:BudgetEntry[], onRefresh:()=>void, canEdit:boolean }) {
  const [title,setTitle]=useState(''); const [desc,setDesc]=useState(''); const [amount,setAmount]=useState('');
  const [comment,setComment]=useState(''); const [saving,setSaving]=useState(false);
  const user = useAuthStore(s=>s.user)!;
  const [cmtList,setCmtList]=useState<Comment[]>([]);
  useEffect(()=>{ mockApi.listComments('budget', parentTaskId).then(setCmtList as any); }, [parentTaskId, budgets]);
  const total = budgets.reduce((a,b)=> a+b.amount,0);
  const handleCreate = async () => {
    if (!title.trim() || !amount) return;
    setSaving(true);
    try {
      await mockApi.createBudget({ parentTaskId, title, description:desc, amount: Number(amount), attachments:[], createdBy:user.id, createdByName:user.employeeName } as any);
      if (comment.trim()) await mockApi.addComment({ entityType:'budget', entityId:parentTaskId, authorId:user.id, authorName:user.employeeName, authorRole:user.role, text: comment });
      setTitle(''); setDesc(''); setAmount(''); setComment('');
      onRefresh();
    } finally { setSaving(false); }
  };
  return (
    <Box>
      <Paper sx={{ p:2, mb:2, bgcolor:'primary.main', color:'#fff', borderRadius:2 }}>
        <Stack direction={{ xs:'column', md:'row' }} justifyContent="space-between">
          <Box><Typography variant="caption" sx={{ opacity:0.8 }}>TOTAL BUDGET</Typography><Typography variant="h5" fontWeight={800}>₹ {total.toLocaleString('en-IN')}</Typography><Typography variant="caption" sx={{ opacity:0.8 }}>{budgets.length} entries</Typography></Box>
          <Box textAlign="right"><Typography variant="caption" sx={{ opacity:0.8 }}>Parent Task</Typography><Typography fontWeight={700}>{parentTaskId}</Typography></Box>
        </Stack>
      </Paper>
      {budgets.map(b=> (
        <Paper key={b.id} variant="outlined" sx={{ p:2, mb:1.5 }}>
          <Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>{b.id} — {b.title}</Typography><Chip label={`₹ ${b.amount.toLocaleString('en-IN')}`} color="primary" size="small" /></Stack>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{b.description}</Typography>
          <Typography variant="caption" color="text.secondary">By {b.createdByName} • {fmtDateTime(b.createdAt)}</Typography>
        </Paper>
      ))}
      {canEdit ? (
        <Paper variant="outlined" sx={{ p:2, mt:2 }}>
          <Typography fontWeight={700} mb={1}>Add budget / cost entry</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}><TextField fullWidth size="small" label="Title *" value={title} onChange={e=>setTitle(e.target.value)} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Amount (₹) *" type="number" value={amount} onChange={e=>setAmount(e.target.value)} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Description" multiline minRows={2} value={desc} onChange={e=>setDesc(e.target.value)} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Comment (history)" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Optional comment for this entry" /></Grid>
            <Grid item xs={12}><Stack direction="row" justifyContent="flex-end"><Button variant="contained" disabled={!title.trim() || !amount || saving} onClick={handleCreate}>{saving?'Saving…':'Save entry'}</Button></Stack></Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">ID is auto-generated (BDG-xxxx). Amount is aggregated in summary card.</Typography>
        </Paper>
      ) : <Alert severity="info" sx={{ mt:2 }}>Only Project Managers can add budget entries.</Alert>}
    </Box>
  );
}

function ProgressTab({ children, parent }: { children: ChildTask[], parent: ParentTask }) {
  const total = children.length;
  const counts = {
    New: children.filter(c=>c.status==='New').length,
    InProgress: children.filter(c=>c.status==='In Progress').length,
    Blocked: children.filter(c=>c.status==='Blocked').length,
    Completed: children.filter(c=>c.status==='Completed').length,
    OnHold: children.filter(c=>c.status==='On Hold').length,
  };
  const pct = total? Math.round((counts.Completed/total)*100) : 0;
  const pieData = [
    { name:'Completed', value: counts.Completed, color:'#059669' },
    { name:'In Progress', value: counts.InProgress, color:'#2563EB' },
    { name:'Blocked', value: counts.Blocked, color:'#DC2626' },
    { name:'New', value: counts.New, color:'#9CA3AF' },
    { name:'On Hold', value: counts.OnHold, color:'#D97706' },
  ].filter(d=>d.value>0);

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p:2 }}>
            <Typography fontWeight={700} mb={1}>Overall progress</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ flex:1 }}><LinearProgress variant="determinate" value={pct} sx={{ height:10, borderRadius:1 }} /><Typography variant="caption" color="text.secondary">{pct}% completed • {total} child tasks</Typography></Box>
              <Typography variant="h5" fontWeight={800}>{pct}%</Typography>
            </Stack>
            <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
              {Object.entries(counts).map(([k,v])=> <Chip key={k} label={`${k}: ${v}`} size="small" />)}
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p:2, height:300 }}>
            <Typography fontWeight={700} mb={1}>Child tasks by status</Typography>
            {pieData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                    {pieData.map((e,i)=> <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <Typography variant="body2" color="text.secondary" mt={6} textAlign="center">No child tasks to display</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p:2 }}>
            <Typography fontWeight={700} mb={1}>Timeline / Gantt (child tasks)</Typography>
            {children.length===0 ? <Typography color="text.secondary" variant="body2">No child tasks yet.</Typography> : (
              <Stack spacing={1.2}>
                {children.map(c=> {
                  // gantt bar: assume parent start 2024-09-01 to 2024-12-31 for scale; simplified: width based on status
                  const colors:any = { 'New':'#E5E7EB','In Progress':'#BFDBFE','Blocked':'#FECACA','Completed':'#A7F3D0','On Hold':'#FDE68A' };
                  return (
                    <Box key={c.id} sx={{ display:'flex', alignItems:'center', gap:1 }}>
                      <Typography variant="caption" sx={{ minWidth:110, fontWeight:600 }}>{c.id}</Typography>
                      <Box sx={{ flex:1, height:22, bgcolor:'action.hover', borderRadius:1, overflow:'hidden', position:'relative' }}>
                        <Box sx={{ height:'100%', width:`${c.status==='Completed'?100: c.status==='In Progress'?66 : 34}%`, bgcolor: colors[c.status]||'#E5E7EB', display:'flex', alignItems:'center', px:1 }}>
                          <Typography variant="caption" fontWeight={600} noWrap>{c.title} — {c.assignToName}</Typography>
                        </Box>
                      </Box>
                      <Chip label={c.status} size="small" />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
