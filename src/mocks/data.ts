import { User, ParentTask, ChildTask, Comment, BudgetEntry, Project, CostCenter, Mapping } from '../types';

export const mockProjects: Project[] = [
  { id:'proj-1', code:'FSL-COMP-01', name:'Computerization of FSL', active:true },
  { id:'proj-2', code:'FSL-NET-02', name:'Network Upgrade - Maharashtra', active:true },
  { id:'proj-3', code:'FSL-TRN-03', name:'Training & Capacity Building', active:false },
];

export const mockCostCenters: CostCenter[] = [
  { id:'cc-1', code:'CC-1001', name:'Infrastructure', active:true },
  { id:'cc-2', code:'CC-1002', name:'Software Development', active:true },
  { id:'cc-3', code:'CC-1003', name:'Operations', active:true },
  { id:'cc-4', code:'CC-1004', name:'Consultancy', active:false },
];

export const mockMappings: Mapping[] = [
  { id:'map-1', projectId:'proj-1', projectName:'Computerization of FSL', costCenterId:'cc-1', costCenterName:'Infrastructure', allocationPct:60, effectiveStart:'2024-04-01', effectiveEnd:'2025-03-31' },
  { id:'map-2', projectId:'proj-1', projectName:'Computerization of FSL', costCenterId:'cc-2', costCenterName:'Software Development', allocationPct:40, effectiveStart:'2024-04-01', effectiveEnd:'2025-03-31' },
  { id:'map-3', projectId:'proj-2', projectName:'Network Upgrade - Maharashtra', costCenterId:'cc-1', costCenterName:'Infrastructure', allocationPct:100, effectiveStart:'2024-06-01', effectiveEnd:'2025-05-31' },
];

const mkAccess = (overrides: Partial<Record<string, boolean>> = {}) => ({
  projectManagement: true,
  taskManagement: true,
  assetManagement: true,
  incidentManagement: true,
  ticketManagement: true,
  reportsDashboard: true,
  ...overrides
});

// users from prompt + extra
export const mockUsers: User[] = [
  {
    id:'u-1', loginId:'rishikesh.oza', employeeName:'Rishikesh Oza', designation:'Director', role:'Operations Manager',
    projectId:'proj-1', projectName:'Computerization of FSL', status:'Active',
    createdAt:'2023-01-10T09:00:00.000Z', effectiveEndDate:null,
    passwordChangedAt:new Date(Date.now()-10*24*3600*1000).toISOString(),
    access: mkAccess(), email:'rishikesh.oza@gov.in'
  },
  {
    id:'u-2', loginId:'tanmay.halaye', employeeName:'Tanmay Halaye', designation:'Director', role:'Operations Manager',
    projectId:'proj-1', projectName:'Computerization of FSL', status:'Active',
    createdAt:'2023-02-15T09:00:00.000Z', effectiveEndDate:null,
    passwordChangedAt:new Date(Date.now()-5*24*3600*1000).toISOString(),
    access: mkAccess(), email:'tanmay.halaye@gov.in'
  },
  {
    id:'u-3', loginId:'pratik.mulgir', employeeName:'Pratik Mulgir', designation:'Project Manager', role:'Project Manager',
    projectId:'proj-1', projectName:'Computerization of FSL', status:'Active',
    createdAt:'2023-03-01T09:00:00.000Z', effectiveEndDate:null,
    passwordChangedAt:new Date(Date.now()-20*24*3600*1000).toISOString(),
    access: mkAccess({ incidentManagement:false }),
    email:'pratik.mulgir@gov.in'
  },
  {
    id:'u-4', loginId:'gaurav.bhangale', employeeName:'Gaurav Bhangale', designation:'Business Analyst', role:'Technical Team Member',
    projectId:'proj-1', projectName:'Computerization of FSL', status:'Active',
    createdAt:'2023-04-10T09:00:00.000Z', effectiveEndDate:null,
    passwordChangedAt:new Date(Date.now()-30*24*3600*1000).toISOString(),
    access: mkAccess({ projectManagement:false, reportsDashboard:false }),
    email:'gaurav.bhangale@gov.in'
  },
  {
    id:'u-5', loginId:'ananya.singh', employeeName:'Ananya Singh', designation:'Network Engineer', role:'Technical Team Member',
    projectId:'proj-1', projectName:'Computerization of FSL', status:'Active',
    createdAt:'2023-05-12T09:00:00.000Z', effectiveEndDate:null,
    passwordChangedAt:new Date(Date.now()-95*24*3600*1000).toISOString(), // expired
    access: mkAccess({ projectManagement:false }),
    email:'ananya.singh@gov.in'
  },
  {
    id:'u-6', loginId:'vikas.patil', employeeName:'Vikas Patil', designation:'System Admin', role:'Technical Team Member',
    projectId:'proj-1', projectName:'Computerization of FSL', status:'Inactive',
    createdAt:'2023-06-01T09:00:00.000Z', effectiveEndDate:'2024-12-31',
    passwordChangedAt:new Date(Date.now()-15*24*3600*1000).toISOString(),
    access: mkAccess(),
    email:'vikas.patil@gov.in'
  },
  {
    id:'u-7', loginId:'sneha.kulkarni', employeeName:'Sneha Kulkarni', designation:'QA Lead', role:'Technical Team Member',
    projectId:'proj-1', projectName:'Computerization of FSL', status:'Active',
    createdAt:'2024-01-20T09:00:00.000Z', effectiveEndDate:null,
    passwordChangedAt:new Date(Date.now()-12*24*3600*1000).toISOString(),
    access: mkAccess({ assetManagement:false, ticketManagement:false }),
    email:'sneha.kulkarni@gov.in'
  },
  {
    id:'u-8', loginId:'rajesh.sharma', employeeName:'Rajesh Sharma', designation:'Finance Officer', role:'Project Manager',
    projectId:'proj-2', projectName:'Network Upgrade - Maharashtra', status:'Active',
    createdAt:'2023-07-01T09:00:00.000Z', effectiveEndDate:null,
    passwordChangedAt:new Date(Date.now()-8*24*3600*1000).toISOString(),
    access: mkAccess(),
    email:'rajesh.sharma@gov.in'
  },
];

export const assetOptions = {
  categories: ['IT Hardware','Networking','Software','Lab Equipment','Facility'] as const,
  classes: {
    'IT Hardware': ['Server','Workstation','Printer','Storage'],
    'Networking': ['Router','Switch','Firewall','Access Point'],
    'Software': ['OS License','Application','Database'],
    'Lab Equipment': ['Forensic Kit','Microscope','Analyzer'],
    'Facility': ['CCTV','UPS','HVAC'],
  } as Record<string, string[]>,
  subTypes: {
    'Server': ['Rack','Blade','Tower'],
    'Workstation': ['Desktop','Laptop'],
    'Router': ['Core','Edge'],
    'Switch': ['L2','L3'],
    'Firewall': ['Next-Gen','UTM'],
    'OS License': ['Windows','Linux'],
  } as Record<string, string[]>,
};

export const locations = ['Mumbai HQ','Pune FSL','Nagpur FSL','Nashik FSL','Aurangabad FSL','Thane Outpost'];

export const mockParentTasks: ParentTask[] = [
  {
    id:'TSK-0001', title:'Data Center Server Procurement & Installation',
    description:'Procurement of 12 rack servers for primary data center, including installation, testing and UAT. Vendor coordination required.',
    assetCategory:'IT Hardware', assetClass:'Server', assetSubType:'Rack', location:'Mumbai HQ',
    startDate:'2024-09-01', endDate:'2024-12-15', dueDate:'2024-12-31',
    severity:'High', priority:'Critical', purpose:'New Setup', status:'In Progress',
    ownerId:'u-3', ownerName:'Pratik Mulgir', createdAt:'2024-08-20T10:00:00Z', updatedAt:'2024-11-01T12:00:00Z', progress:62
  },
  {
    id:'TSK-0002', title:'Network Security Audit - Phase 2',
    description:'Comprehensive audit of firewall policies, IDS/IPS logs and vulnerability assessment across all FSL sites.',
    assetCategory:'Networking', assetClass:'Firewall', assetSubType:'Next-Gen', location:'Pune FSL',
    startDate:'2024-10-01', endDate:'2024-11-30', dueDate:'2024-12-10',
    severity:'Critical', priority:'Critical', purpose:'Compliance', status:'Blocked',
    ownerId:'u-3', ownerName:'Pratik Mulgir', createdAt:'2024-09-15T10:00:00Z', updatedAt:'2024-10-20T12:00:00Z', progress:35
  },
  {
    id:'TSK-0003', title:'LIMS Software Upgrade to v4.2',
    description:'Upgrade Laboratory Information Management System with new evidence tracking module and migration of legacy data.',
    assetCategory:'Software', assetClass:'Application', assetSubType:'', location:'Mumbai HQ',
    startDate:'2024-11-01', endDate:'2025-02-28', dueDate:'2025-03-15',
    severity:'Medium', priority:'High', purpose:'Enhancement', status:'New',
    ownerId:'u-8', ownerName:'Rajesh Sharma', createdAt:'2024-10-25T10:00:00Z', updatedAt:'2024-10-25T10:00:00Z', progress:0
  },
  {
    id:'TSK-0004', title:'CCTV & Access Control for New Wing',
    description:'Installation of 48 camera points, biometric access and integration with central monitoring dashboard.',
    assetCategory:'Facility', assetClass:'CCTV', assetSubType:'', location:'Nagpur FSL',
    startDate:'2024-08-15', endDate:'2024-10-30', dueDate:'2024-11-05',
    severity:'Low', priority:'Medium', purpose:'New Setup', status:'Completed',
    ownerId:'u-3', ownerName:'Pratik Mulgir', createdAt:'2024-08-01T10:00:00Z', updatedAt:'2024-10-30T10:00:00Z', progress:100
  },
  {
    id:'TSK-0005', title:'Forensic Workstation Calibration',
    description:'Annual calibration and certification of 25 workstations across 3 sites, OEM coordination and documentation.',
    assetCategory:'Lab Equipment', assetClass:'Forensic Kit', assetSubType:'', location:'Nashik FSL',
    startDate:'2024-09-10', endDate:'2024-11-10', dueDate:'2024-11-20',
    severity:'High', priority:'High', purpose:'Maintenance', status:'On Hold',
    ownerId:'u-3', ownerName:'Pratik Mulgir', createdAt:'2024-09-05T10:00:00Z', updatedAt:'2024-10-18T10:00:00Z', progress:45
  },
  {
    id:'TSK-0006', title:'WAN Link Redundancy Implementation',
    description:'Secondary MPLS link provisioning for Pune & Nagpur, failover testing and documentation.',
    assetCategory:'Networking', assetClass:'Router', assetSubType:'Edge', location:'Pune FSL',
    startDate:'2024-10-15', endDate:'2024-12-20', dueDate:'2024-12-25',
    severity:'High', priority:'Critical', purpose:'New Setup', status:'In Progress',
    ownerId:'u-3', ownerName:'Pratik Mulgir', createdAt:'2024-10-01T10:00:00Z', updatedAt:'2024-10-28T12:00:00Z', progress:55
  },
];

export const mockChildTasks: ChildTask[] = [
  {
    id:'CTSK-0001', title:'Vendor finalization - Rack Servers', taskType:'Procurement', parentTaskId:'TSK-0001',
    linkedChildTaskId:null, assignToId:'u-4', assignToName:'Gaurav Bhangale', status:'Completed',
    activities:[{id:'a1', text:'Floating RFP and evaluation done', createdAt:'2024-09-05T10:00:00Z', authorId:'u-4', authorName:'Gaurav Bhangale'}],
    startDate:'2024-09-01', endDate:'2024-09-20', createdAt:'2024-09-01T09:00:00Z', updatedAt:'2024-09-20T10:00:00Z', attachments:[]
  },
  {
    id:'CTSK-0002', title:'Server staging and burn-in testing', taskType:'Implementation', parentTaskId:'TSK-0001',
    linkedChildTaskId:'CTSK-0001', assignToId:'u-5', assignToName:'Ananya Singh', status:'In Progress',
    activities:[{id:'a2', text:'Staging 6/12 servers complete', createdAt:'2024-10-15T10:00:00Z', authorId:'u-5', authorName:'Ananya Singh'}],
    startDate:'2024-09-21', endDate:'2024-10-30', createdAt:'2024-09-21T09:00:00Z', updatedAt:'2024-10-15T10:00:00Z', attachments:[]
  },
  {
    id:'CTSK-0003', title:'UAT and Go-Live', taskType:'Testing', parentTaskId:'TSK-0001',
    linkedChildTaskId:'CTSK-0002', assignToId:'u-7', assignToName:'Sneha Kulkarni', status:'New',
    activities:[], startDate:'2024-11-01', endDate:'2024-12-15', createdAt:'2024-09-22T09:00:00Z', updatedAt:'2024-09-22T09:00:00Z', attachments:[]
  },
  {
    id:'CTSK-0004', title:'Firewall policy review - Mumbai', taskType:'Audit', parentTaskId:'TSK-0002',
    linkedChildTaskId:null, assignToId:'u-5', assignToName:'Ananya Singh', status:'Blocked',
    activities:[{id:'a3', text:'Blocked: awaiting OEM logs', createdAt:'2024-10-20T10:00:00Z', authorId:'u-5', authorName:'Ananya Singh'}],
    startDate:'2024-10-01', endDate:'2024-10-20', createdAt:'2024-10-01T09:00:00Z', updatedAt:'2024-10-20T10:00:00Z', attachments:[]
  },
  {
    id:'CTSK-0005', title:'Vulnerability scan - Pune site', taskType:'Audit', parentTaskId:'TSK-0002',
    linkedChildTaskId:null, assignToId:'u-4', assignToName:'Gaurav Bhangale', status:'In Progress',
    activities:[], startDate:'2024-10-05', endDate:'2024-11-15', createdAt:'2024-10-05T09:00:00Z', updatedAt:'2024-10-25T10:00:00Z', attachments:[]
  },
  {
    id:'CTSK-0006', title:'MPLS vendor coordination', taskType:'Implementation', parentTaskId:'TSK-0006',
    linkedChildTaskId:null, assignToId:'u-4', assignToName:'Gaurav Bhangale', status:'In Progress',
    activities:[{id:'a4', text:'Site survey done for Pune', createdAt:'2024-10-18T10:00:00Z', authorId:'u-4', authorName:'Gaurav Bhangale'}],
    startDate:'2024-10-15', endDate:'2024-11-30', createdAt:'2024-10-15T09:00:00Z', updatedAt:'2024-10-18T10:00:00Z', attachments:[]
  },
];

export const mockComments: Comment[] = [
  { id:'c1', entityType:'parent', entityId:'TSK-0001', authorId:'u-3', authorName:'Pratik Mulgir', authorRole:'Project Manager', text:'Please prioritize vendor evaluation. Deadline is tight.', createdAt:'2024-09-02T09:30:00Z' },
  { id:'c2', entityType:'parent', entityId:'TSK-0001', authorId:'u-4', authorName:'Gaurav Bhangale', authorRole:'Technical Team Member', text:'Vendor shortlisted - 3 OEMs qualified.', createdAt:'2024-09-10T11:00:00Z' },
  { id:'c3', entityType:'child', entityId:'CTSK-0002', authorId:'u-5', authorName:'Ananya Singh', authorRole:'Technical Team Member', text:'Power supply issue in 2 servers, raised ticket with OEM.', createdAt:'2024-10-16T10:00:00Z' },
  { id:'c4', entityType:'budget', entityId:'BDG-0001', authorId:'u-3', authorName:'Pratik Mulgir', authorRole:'Project Manager', text:'Finance approval pending.', createdAt:'2024-09-25T14:00:00Z' },
];

export const mockBudgets: BudgetEntry[] = [
  { id:'BDG-0001', parentTaskId:'TSK-0001', title:'Server hardware - 12 units', description:'Dell R760 - quoted price inclusive of 3-yr support', amount:4800000, attachments:[], createdAt:'2024-09-12T10:00:00Z', createdBy:'u-3', createdByName:'Pratik Mulgir' },
  { id:'BDG-0002', parentTaskId:'TSK-0001', title:'Installation & cabling', description:'Structured cabling + rack electrification', amount:350000, attachments:[], createdAt:'2024-09-20T10:00:00Z', createdBy:'u-3', createdByName:'Pratik Mulgir' },
  { id:'BDG-0003', parentTaskId:'TSK-0002', title:'Audit tool licenses', description:'Nessus & firewall analyzer - annual', amount:650000, attachments:[], createdAt:'2024-10-02T10:00:00Z', createdBy:'u-3', createdByName:'Pratik Mulgir' },
];
