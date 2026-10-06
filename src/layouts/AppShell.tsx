import { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Avatar, Menu, MenuItem, Divider, Tooltip, Stack, Chip, useMediaQuery, Collapse } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import BarChartIcon from '@mui/icons-material/BarChart';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { ModuleKey } from '../types';
import { NotificationBell } from '../features/tickets/components/NotificationBell';
import { ToastHost } from '../features/tickets/components/ToastHost';

const drawerWidth = 260;
const collapsedWidth = 72;

const moduleConfig: { key: ModuleKey | 'admin', label:string, icon:any, path:string, adminOnly?:boolean }[] = [
  { key:'projectManagement', label:'Project Management', icon: AccountTreeIcon, path:'/projects' },
  { key:'taskManagement', label:'Task Management', icon: AssignmentIcon, path:'/tasks' },
  { key:'ticketManagement', label:'Ticket Management', icon: ConfirmationNumberIcon, path:'/tickets' },
  { key:'assetManagement', label:'Asset Management', icon: InventoryIcon, path:'/assets' },
  { key:'incidentManagement', label:'Incident Management', icon: ReportProblemIcon, path:'/incidents' },
  { key:'reportsDashboard', label:'Reports & Dashboard', icon: BarChartIcon, path:'/reports' },
  { key:'admin', label:'Admin / Masters', icon: AdminPanelSettingsIcon, path:'/admin', adminOnly:true },
];

export function AppShell() {
  const { user, logout } = useAuthStore();
  const { mode, toggleMode, sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null|HTMLElement>(null);
  const [adminOpen, setAdminOpen] = useState(location.pathname.startsWith('/admin'));

  if (!user) return null;

  const canSee = (key: ModuleKey | 'admin') => {
    if (key==='admin') return user.role==='Operations Manager';
    // Operations Manager sees all regardless of flags? spec says access flags per user, but OM can access all modules
    if (user.role==='Operations Manager') return true;
    if (key in user.access) return (user.access as any)[key];
    return true;
  };

  const filtered = moduleConfig.filter(m=> canSee(m.key));

  const drawerContent = (
    <Box sx={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <Toolbar sx={{ minHeight:64, gap:1 }}>
        {!sidebarCollapsed && !isMobile && (
          <Box sx={{ display:'flex', alignItems:'center', gap:1.2, flex:1 }}>
            <Box sx={{ width:36, height:36, borderRadius:2, bgcolor:'primary.main', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700 }}>FSL</Box>
            <Box>
              <Typography fontWeight={800} fontSize={14} lineHeight={1}>Gov EMA</Typography>
              <Typography variant="caption" color="text.secondary">FSL Computerization</Typography>
            </Box>
          </Box>
        )}
        {!isMobile && (
          <IconButton size="small" onClick={toggleSidebar}><ChevronLeftIcon sx={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition:'0.2s' }} /></IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flex:1, px:1, py:1 }}>
        {filtered.map(item=> {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          if (item.key==='admin') {
            return (
              <Box key={item.key}>
                <ListItemButton onClick={()=> setAdminOpen(v=>!v)} selected={active} sx={{ borderRadius:2, mb:0.5 }}>
                  <ListItemIcon sx={{ minWidth: sidebarCollapsed && !isMobile ? 36 : 40 }}><Icon fontSize="small" /></ListItemIcon>
                  {(!sidebarCollapsed || isMobile) && <><ListItemText primary={item.label} primaryTypographyProps={{ fontSize:14, fontWeight: active?700:500 }} /><Box>{adminOpen ? <ExpandLess fontSize="small"/> : <ExpandMore fontSize="small"/>}</Box></>}
                </ListItemButton>
                <Collapse in={adminOpen && (!sidebarCollapsed || isMobile)} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ pl:2 }}>
                    {[
                      { label:'Projects', path:'/admin/projects' },
                      { label:'Cost Centers', path:'/admin/cost-centers' },
                      { label:'Project–CC Mapping', path:'/admin/mappings' },
                      { label:'Users', path:'/admin/users' },
                      { label:'Roles & Access', path:'/admin/roles' },
                    ].map(sub=> (
                      <ListItemButton key={sub.path} sx={{ borderRadius:2, py:0.6, pl:4 }} selected={location.pathname===sub.path} onClick={()=>{ navigate(sub.path); if(isMobile) setMobileOpen(false); }}>
                        <ListItemText primary={sub.label} primaryTypographyProps={{ fontSize:13 }} />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          }
          return (
            <ListItemButton key={item.key} selected={active} onClick={()=>{ navigate(item.path); if(isMobile) setMobileOpen(false); }} sx={{ borderRadius:2, mb:0.5 }}>
              <ListItemIcon sx={{ minWidth: sidebarCollapsed && !isMobile ? 36 : 40 }}><Icon fontSize="small" /></ListItemIcon>
              {(!sidebarCollapsed || isMobile) && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize:14, fontWeight: active?700:500 }} />}
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p:1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <BusinessIcon fontSize="small" color="disabled" />
          {(!sidebarCollapsed || isMobile) && <Box flex={1} minWidth={0}><Typography variant="caption" color="text.secondary">Project</Typography><Typography variant="body2" fontWeight={600} noWrap>{user.projectName}</Typography></Box>}
        </Stack>
      </Box>
    </Box>
  );

  const effectiveDrawerWidth = isMobile ? drawerWidth : (sidebarCollapsed ? collapsedWidth : drawerWidth);

  return (
    <Box sx={{ display:'flex', minHeight:'100vh', bgcolor:'background.default' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ zIndex:1201, left: { md: effectiveDrawerWidth }, width: { md: `calc(100% - ${effectiveDrawerWidth}px)` } }}>
        <Toolbar sx={{ gap:2 }}>
          <IconButton edge="start" onClick={()=> isMobile ? setMobileOpen(v=>!v) : toggleSidebar()}><MenuIcon /></IconButton>
          <Box flex={1} minWidth={0}>
            <Typography variant="h6" fontWeight={800} noWrap>Enterprise Management</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{user.projectName} • Government of Maharashtra — Forensic Science Laboratory</Typography>
          </Box>
          <Chip label={user.role} size="small" color={user.role==='Operations Manager'?'primary': user.role==='Project Manager'?'secondary':'default'} sx={{ display:{ xs:'none', md:'flex' } }} />
          {user.access.ticketManagement && <NotificationBell />}
          <Tooltip title="Toggle theme"><IconButton onClick={toggleMode}>{mode==='light' ? <DarkModeIcon/> : <LightModeIcon/>}</IconButton></Tooltip>
          <IconButton onClick={(e)=>setAnchorEl(e.currentTarget)} sx={{ p:0 }}>
            <Avatar sx={{ bgcolor:'primary.main', width:36, height:36, fontSize:14 }}>{user.employeeName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={()=>setAnchorEl(null)}>
            <Box sx={{ px:2, py:1 }}>
              <Typography fontWeight={700}>{user.employeeName}</Typography>
              <Typography variant="caption" color="text.secondary">{user.designation} • {user.loginId}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={()=>{ setAnchorEl(null); navigate('/profile'); }}>My Profile</MenuItem>
            <MenuItem onClick={()=>{ logout(); navigate('/login'); }}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: effectiveDrawerWidth }, flexShrink:{ md:0 } }}>
        {isMobile ? (
          <Drawer variant="temporary" open={mobileOpen} onClose={()=>setMobileOpen(false)} ModalProps={{ keepMounted:true }} sx={{ '& .MuiDrawer-paper':{ width: drawerWidth } }}>{drawerContent}</Drawer>
        ) : (
          <Drawer variant="permanent" open sx={{ '& .MuiDrawer-paper':{ width: effectiveDrawerWidth, transition:'width 0.2s', overflowX:'hidden', boxSizing:'border-box' } }}>{drawerContent}</Drawer>
        )}
      </Box>

      <Box component="main" sx={{ flexGrow:1, p:{ xs:2, md:3 }, width:{ md:`calc(100% - ${effectiveDrawerWidth}px)` }, mt:'64px', minHeight:'calc(100vh - 64px)', bgcolor:'background.default' }}>
        <Outlet />
      </Box>
      <ToastHost />
    </Box>
  );
}
