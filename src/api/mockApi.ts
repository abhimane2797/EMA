// In-memory mock API that mimics REST. Delay 300-500ms.
import { mockUsers, mockParentTasks, mockChildTasks, mockComments, mockBudgets, mockProjects, mockCostCenters, mockMappings, assetOptions, locations } from '../mocks/data';
import { AuthResponse, ParentTask, ChildTask, Comment, BudgetEntry, Project, CostCenter, Mapping, TaskMeta, User } from '../types';
import { isPasswordExpired, genId } from '../utils';

const delay = (ms=350) => new Promise(r=>setTimeout(r, ms));
const clone = <T>(v:T):T => JSON.parse(JSON.stringify(v));

let parents: ParentTask[] = clone(mockParentTasks);
let children: ChildTask[] = clone(mockChildTasks);
let comments: Comment[] = clone(mockComments);
let budgets: BudgetEntry[] = clone(mockBudgets);
let projects: Project[] = clone(mockProjects);
let costCenters: CostCenter[] = clone(mockCostCenters);
let mappings: Mapping[] = clone(mockMappings);
let users: User[] = clone(mockUsers);

function calcProgress(parentId: string) {
  const cs = children.filter(c=>c.parentTaskId===parentId);
  if (!cs.length) return 0;
  const done = cs.filter(c=>c.status==='Completed').length;
  return Math.round((done/cs.length)*100);
}

export const mockApi = {
  // auth
  async login(loginId: string, password: string): Promise<AuthResponse> {
    await delay();
    // password is mock: any non-empty equals "Password@123" else fail; but we allow any for demo unless empty
    const user = users.find(u=>u.loginId.toLowerCase()===loginId.toLowerCase());
    if (!user) throw { response:{ status:401, data:{ message:'Invalid Login ID or password' } } };
    if (user.status==='Inactive') throw { response:{ status:403, data:{ message:'Your account is inactive. Contact administrator.' } } };
    if (password !== 'Password@123' && password !== 'password' && password !== '123456') {
      // allow generic demo password but show error if clearly wrong? For UX we accept any 6+ chars; but to demo error, check length
      if (password.length < 3) throw { response:{ status:401, data:{ message:'Invalid Login ID or password' } } };
    }
    if (isPasswordExpired(user.passwordChangedAt, 90)) {
      return { token:'mock-jwt-expired', user, passwordExpired:true };
    }
    return { token:'mock-jwt-'+user.id+'-'+Date.now(), user, passwordExpired:false };
  },
  async changePassword(userId: string, oldPwd: string, newPwd: string) {
    await delay();
    const u = users.find(x=>x.id===userId);
    if (!u) throw new Error('User not found');
    // mock success
    u.passwordChangedAt = new Date().toISOString();
    return { message:'Password changed successfully' };
  },

  // parent tasks
  async listParents(params: { q?:string, status?:string, priority?:string, severity?:string, location?:string, page?:number, pageSize?:number, sortBy?:string, sortDir?: 'asc'|'desc', forUserId?: string }) {
    await delay(300);
    let data = [...parents];
    // role filtering: if forUserId is tech member, show only their tasks (ownerId)
    // For demo we filter when supplied
    if (params.forUserId) {
      const user = users.find(u=>u.id===params.forUserId);
      if (user?.role==='Technical Team Member') data = data.filter(p=> p.ownerId===user.id || children.some(c=>c.parentTaskId===p.id && c.assignToId===user.id));
    }
    if (params.q) {
      const q=params.q.toLowerCase();
      data = data.filter(p=> p.id.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.assetCategory.toLowerCase().includes(q));
    }
    if (params.status) data=data.filter(p=>p.status===params.status);
    if (params.priority) data=data.filter(p=>p.priority===params.priority);
    if (params.severity) data=data.filter(p=>p.severity===params.severity);
    if (params.location) data=data.filter(p=>p.location===params.location);
    if (params.sortBy) {
      const dir = params.sortDir==='desc'? -1:1;
      data.sort((a:any,b:any)=> {
        const av=a[params.sortBy!], bv=b[params.sortBy!];
        if (av===bv) return 0;
        return av > bv ? dir : -dir;
      });
    }
    const total=data.length;
    const page=params.page||1, pageSize=params.pageSize||10;
    const paged=data.slice((page-1)*pageSize, page*pageSize);
    // attach progress
    paged.forEach(p=> p.progress = calcProgress(p.id));
    return { data: paged, total, page, pageSize };
  },
  async getParent(id:string) {
    await delay(200);
    const p = parents.find(x=>x.id===id);
    if (!p) throw new Error('Parent task not found');
    return { ...p, progress: calcProgress(id) };
  },
  async createParent(payload: Omit<ParentTask,'id'|'createdAt'|'updatedAt'|'progress'|'ownerName'> & { ownerId:string }) {
    await delay();
    const next = parents.length+1+ Math.floor(Math.random()*10); // ensure unique
    const id = genId('TSK', parents.length+1);
    // ensure unique
    let finalId=id;
    let cnt=1;
    while(parents.some(p=>p.id===finalId)) { finalId=genId('TSK', parents.length+cnt); cnt++; }
    const owner = users.find(u=>u.id===payload.ownerId);
    const rec: ParentTask = {
      id: finalId,
      title: payload.title, description: payload.description,
      assetCategory: payload.assetCategory, assetClass: payload.assetClass, assetSubType: payload.assetSubType,
      location: payload.location, startDate: payload.startDate, endDate: payload.endDate, dueDate: payload.dueDate,
      severity: payload.severity, priority: payload.priority, purpose: payload.purpose, status: payload.status,
      ownerId: payload.ownerId, ownerName: owner?.employeeName || 'Unknown',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), progress:0
    };
    parents.unshift(rec);
    return rec;
  },
  async updateParent(id:string, patch: Partial<ParentTask>) {
    await delay();
    const idx=parents.findIndex(p=>p.id===id);
    if (idx<0) throw new Error('Not found');
    parents[idx] = { ...parents[idx], ...patch, updatedAt: new Date().toISOString() } as ParentTask;
    return parents[idx];
  },

  // child tasks
  async listChildren(params:{ q?:string, parentTaskId?:string, status?:string, assignToId?:string, page?:number, pageSize?:number }) {
    await delay(250);
    let data=[...children];
    if (params.q) { const q=params.q.toLowerCase(); data=data.filter(c=> c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)); }
    if (params.parentTaskId) data=data.filter(c=>c.parentTaskId===params.parentTaskId);
    if (params.status) data=data.filter(c=>c.status===params.status);
    if (params.assignToId) data=data.filter(c=>c.assignToId===params.assignToId);
    const total=data.length;
    const page=params.page||1, pageSize=params.pageSize||10;
    const paged=data.slice((page-1)*pageSize, page*pageSize);
    return { data:paged, total, page, pageSize };
  },
  async getChild(id:string) {
    await delay(200);
    const c=children.find(x=>x.id===id);
    if (!c) throw new Error('Child not found');
    return clone(c);
  },
  async createChild(payload: Omit<ChildTask,'id'|'createdAt'|'updatedAt'|'activities'|'attachments'> & { activities?:any, attachments?:any }) {
    await delay();
    const id = genId('CTSK', children.length+1);
    let finalId=id; let cnt=1; while(children.some(c=>c.id===finalId)) { finalId=genId('CTSK', children.length+cnt); cnt++; }
    const assignUser = users.find(u=>u.id===payload.assignToId);
    const rec: ChildTask = {
      id: finalId, title: payload.title, taskType: payload.taskType, parentTaskId: payload.parentTaskId,
      linkedChildTaskId: payload.linkedChildTaskId || null, assignToId: payload.assignToId, assignToName: assignUser?.employeeName || '',
      status: payload.status as any, activities:[], startDate: payload.startDate, endDate: payload.endDate,
      createdAt: new Date().toISOString(), updatedAt:new Date().toISOString(), attachments: []
    };
    children.unshift(rec);
    return rec;
  },
  async updateChild(id:string, patch: Partial<ChildTask> & { newActivity?:string, newComment?:string, authorId?:string }) {
    await delay();
    const idx=children.findIndex(c=>c.id===id);
    if (idx<0) throw new Error('Not found');
    const cur=children[idx];
    if (patch.newActivity && patch.newActivity.trim()) {
      const author = users.find(u=>u.id===patch.authorId);
      cur.activities.push({ id:'act-'+Date.now(), text: patch.newActivity, createdAt:new Date().toISOString(), authorId: patch.authorId||'', authorName: author?.employeeName||'' });
    }
    // merge other fields
    const { newActivity, newComment, authorId, ...rest } = patch as any;
    children[idx] = { ...cur, ...rest, updatedAt:new Date().toISOString() } as ChildTask;
    return children[idx];
  },
  async addAttachment(childId: string, file: File) {
    await delay(400);
    const c=children.find(x=>x.id===childId);
    if (!c) throw new Error('Not found');
    const att = { id:'att-'+Date.now(), name:file.name, size:file.size, type:file.type||'application/octet-stream', url: URL.createObjectURL(file), uploadedAt:new Date().toISOString(), uploadedBy:'Current User' };
    c.attachments.push(att as any);
    return att;
  },

  // comments
  async listComments(entityType: string, entityId: string) {
    await delay(200);
    return comments.filter(c=>c.entityType===entityType && c.entityId===entityId).sort((a,b)=> new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime());
  },
  async addComment(payload: Omit<Comment,'id'|'createdAt'>) {
    await delay();
    const rec: Comment = { ...payload, id:'cmt-'+Date.now(), createdAt:new Date().toISOString() };
    comments.push(rec);
    return rec;
  },

  // budgets
  async listBudgets(parentTaskId: string) {
    await delay(200);
    return budgets.filter(b=>b.parentTaskId===parentTaskId);
  },
  async createBudget(payload: Omit<BudgetEntry,'id'|'createdAt'>) {
    await delay();
    const id=genId('BDG', budgets.length+1);
    let final=id; let cnt=1; while(budgets.some(b=>b.id===final)) { final=genId('BDG', budgets.length+cnt); cnt++; }
    const rec: BudgetEntry = { ...payload as any, id:final, createdAt:new Date().toISOString() } as BudgetEntry;
    budgets.unshift(rec);
    return rec;
  },

  // admin
  async listProjects() { await delay(200); return clone(projects); },
  async createProject(p: Omit<Project,'id'>) { await delay(); const rec={...p, id:'proj-'+Date.now()}; projects.push(rec); return rec; },
  async updateProject(id:string, patch:Partial<Project>) { await delay(); const i=projects.findIndex(p=>p.id===id); if(i<0) throw new Error('not found'); projects[i]={...projects[i],...patch}; return projects[i]; },
  async deleteProject(id:string){ await delay(); projects=projects.filter(p=>p.id!==id); return true; },

  async listCostCenters() { await delay(200); return clone(costCenters); },
  async createCostCenter(p: Omit<CostCenter,'id'>) { await delay(); const rec={...p, id:'cc-'+Date.now()}; costCenters.push(rec); return rec; },
  async updateCostCenter(id:string, patch:Partial<CostCenter>) { await delay(); const i=costCenters.findIndex(p=>p.id===id); if(i<0) throw new Error('not found'); costCenters[i]={...costCenters[i],...patch}; return costCenters[i]; },
  async deleteCostCenter(id:string){ await delay(); costCenters=costCenters.filter(p=>p.id!==id); return true; },

  async listMappings() { await delay(200); return clone(mappings); },
  async createMapping(p: Omit<Mapping,'id'|'projectName'|'costCenterName'>) { await delay();
    const proj=projects.find(x=>x.id===p.projectId); const cc=costCenters.find(x=>x.id===p.costCenterId);
    const rec:Mapping = {...p, id:'map-'+Date.now(), projectName:proj?.name||'', costCenterName:cc?.name||''};
    mappings.push(rec); return rec; },
  async updateMapping(id:string, patch:Partial<Mapping>) { await delay(); const i=mappings.findIndex(m=>m.id===id); if(i<0) throw new Error('not found'); const proj=projects.find(x=>x.id===(patch.projectId||mappings[i].projectId)); const cc=costCenters.find(x=>x.id===(patch.costCenterId||mappings[i].costCenterId)); mappings[i]={...mappings[i],...patch, projectName:proj?.name||mappings[i].projectName, costCenterName:cc?.name||mappings[i].costCenterName}; return mappings[i]; },
  async deleteMapping(id:string){ await delay(); mappings=mappings.filter(m=>m.id!==id); return true; },

  async listUsers() { await delay(250); return clone(users); },
  async createUser(u: Partial<User> & { loginId:string, employeeName:string }) { await delay();
    const rec:User = {
      id:'u-'+Date.now(), loginId:u.loginId, employeeName:u.employeeName, designation:u.designation||'',
      role: (u.role as any)||'Technical Team Member', projectId:u.projectId||'proj-1', projectName: projects.find(p=>p.id===u.projectId)?.name || 'Computerization of FSL',
      status: (u.status as any)||'Active', createdAt:new Date().toISOString(), effectiveEndDate:u.effectiveEndDate||null,
      passwordChangedAt:new Date().toISOString(), access: u.access || { projectManagement:true, taskManagement:true, assetManagement:true, incidentManagement:true, ticketManagement:true, reportsDashboard:true },
      email:u.email
    }; users.push(rec); return rec; },
  async updateUser(id:string, patch:Partial<User>) { await delay(); const i=users.findIndex(u=>u.id===id); if(i<0) throw new Error('not found'); users[i]={...users[i],...patch} as User; return users[i]; },
  async deleteUser(id:string){ await delay(); users=users.filter(u=>u.id!==id); return true; },
  async resetPassword(userId:string){ await delay(); const u=users.find(x=>x.id===userId); if(u) u.passwordChangedAt=new Date().toISOString(); return { message:'Password reset to default. User must change on next login.' }; },

  // Dropdown option lists — the real client fetches GET /tasks/meta.
  async getTaskMeta(): Promise<TaskMeta> {
    await delay(120);
    return {
      assetCategories: [...assetOptions.categories],
      assetClasses: [...new Set(Object.values(assetOptions.classes).flat())],
      assetSubTypes: [...new Set(Object.values(assetOptions.subTypes).flat())],
      locations: [...locations],
      purposes: ['New Setup','Replacement','Maintenance','Enhancement','Support','Compliance','Other'],
      taskTypes: ['Development','Testing','Installation','Configuration','Deployment','Maintenance','Documentation','Training','Other'],
      statuses: ['New','In Progress','On Hold','Blocked','Completed'],
      severities: ['Low','Medium','High','Critical'],
      priorities: ['Low','Medium','High','Critical'],
    };
  },

  /** Mock attachments use blob: URLs, so the "download" is just the URL. */
  async downloadAttachment(_kind: 'parent' | 'child' | 'budget', _docRef: string, attachmentId: string) {
    await delay(80);
    const pool = [...children.flatMap(c=>c.attachments), ...budgets.flatMap(b=>b.attachments)];
    const found = pool.find(a=>a.id===attachmentId);
    if (!found) throw { response:{ status:404, data:{ message:'Attachment not found' } } };
    return found.url;
  },

  // helpers
  getUsersSync(){ return users; },
};
