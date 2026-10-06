import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';
import { LoginPage } from '../features/auth/LoginPage';
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage';
import { RequireAuth, RequireRole, RequireModule } from './ProtectedRoute';
import { TasksPage } from '../features/tasks/TasksPage';
import { ParentTaskCreate } from '../features/tasks/ParentTaskCreate';
import { ParentTaskDetail } from '../features/tasks/ParentTaskDetail';
import { ChildTaskCreate } from '../features/tasks/ChildTaskCreate';
import { ChildTaskDetail } from '../features/tasks/ChildTaskDetail';
import { ProjectsAdmin } from '../features/admin/ProjectsAdmin';
import { CostCentersAdmin } from '../features/admin/CostCentersAdmin';
import { MappingsAdmin } from '../features/admin/MappingsAdmin';
import { UsersAdmin } from '../features/admin/UsersAdmin';
import { RolesAccessAdmin } from '../features/admin/RolesAccessAdmin';
import { ComingSoon } from '../pages/ComingSoon';
import { TicketsDashboard } from '../features/tickets/pages/TicketsDashboard';
import { TicketBoardPage } from '../features/tickets/pages/TicketBoardPage';
import { TicketBacklogPage } from '../features/tickets/pages/TicketBacklogPage';
import { TicketListPage } from '../features/tickets/pages/TicketListPage';
import { TicketCreatePage } from '../features/tickets/pages/TicketCreatePage';
import { TicketDetailPage } from '../features/tickets/pages/TicketDetailPage';
import { TicketReportsPage } from '../features/tickets/pages/TicketReportsPage';
import { TicketSettingsPage } from '../features/tickets/pages/TicketSettingsPage';
import { Dashboard } from '../pages/Dashboard';

export const router = createBrowserRouter([
  { path:'/login', element:<LoginPage/> },
  { path:'/change-password', element:<ChangePasswordPage/> },
  {
    element:<RequireAuth />,
    children:[
      {
        element:<AppShell />,
        children:[
          { path:'/', element:<Navigate to="/tasks" replace /> },
          { path:'/dashboard', element:<Dashboard /> },
          // Task Management — guarded by module access
          { path:'/tasks', element:<RequireModule moduleKey="taskManagement"><TasksPage/></RequireModule> },
          { path:'/tasks/parent/new', element:<RequireRole roles={['Project Manager','Operations Manager']}><ParentTaskCreate/></RequireRole> },
          { path:'/tasks/parent/:id', element:<RequireModule moduleKey="taskManagement"><ParentTaskDetail/></RequireModule> },
          { path:'/tasks/child/new', element:<RequireModule moduleKey="taskManagement"><ChildTaskCreate/></RequireModule> },
          { path:'/tasks/child/:id', element:<RequireModule moduleKey="taskManagement"><ChildTaskDetail/></RequireModule> },

          // Ticket Management — Jira style module gated by the ticketManagement access flag
          { path:'/tickets', element:<RequireModule moduleKey="ticketManagement"><TicketsDashboard/></RequireModule> },
          { path:'/tickets/list', element:<RequireModule moduleKey="ticketManagement"><TicketListPage/></RequireModule> },
          { path:'/tickets/board', element:<RequireModule moduleKey="ticketManagement"><TicketBoardPage/></RequireModule> },
          { path:'/tickets/backlog', element:<RequireModule moduleKey="ticketManagement"><TicketBacklogPage/></RequireModule> },
          { path:'/tickets/new', element:<RequireModule moduleKey="ticketManagement"><TicketCreatePage/></RequireModule> },
          { path:'/tickets/reports', element:<RequireModule moduleKey="ticketManagement"><TicketReportsPage/></RequireModule> },
          { path:'/tickets/settings', element:<RequireModule moduleKey="ticketManagement"><TicketSettingsPage/></RequireModule> },
          { path:'/tickets/:key', element:<RequireModule moduleKey="ticketManagement"><TicketDetailPage/></RequireModule> },

          // Other modules — placeholders but still access-controlled
          { path:'/projects', element:<RequireModule moduleKey="projectManagement"><ComingSoon title="Project Management" module="Project Management" /></RequireModule> },
          { path:'/assets', element:<RequireModule moduleKey="assetManagement"><ComingSoon title="Asset Management" module="Asset Management" /></RequireModule> },
          { path:'/incidents', element:<RequireModule moduleKey="incidentManagement"><ComingSoon title="Incident Management" module="Incident Management" /></RequireModule> },
          { path:'/reports', element:<RequireModule moduleKey="reportsDashboard"><ComingSoon title="Reports & Dashboard" module="Reports & Dashboard" /></RequireModule> },

          // Admin — Operations Manager only
          { path:'/admin', element:<RequireRole roles={['Operations Manager']}><ComingSoon title="Admin / Masters" module="Select a sub-module from sidebar" /></RequireRole> },
          { path:'/admin/projects', element:<RequireRole roles={['Operations Manager']}><ProjectsAdmin/></RequireRole> },
          { path:'/admin/cost-centers', element:<RequireRole roles={['Operations Manager']}><CostCentersAdmin/></RequireRole> },
          { path:'/admin/mappings', element:<RequireRole roles={['Operations Manager']}><MappingsAdmin/></RequireRole> },
          { path:'/admin/users', element:<RequireRole roles={['Operations Manager']}><UsersAdmin/></RequireRole> },
          { path:'/admin/roles', element:<RequireRole roles={['Operations Manager']}><RolesAccessAdmin/></RequireRole> },

          { path:'/profile', element:<ComingSoon title="My Profile" /> },
          { path:'*', element:<ComingSoon title="Page not found" /> },
        ]
      }
    ]
  }
]);
