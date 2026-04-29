import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Routes, Router } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { RegisterComponent } from './features/auth/pages/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { AuthService } from './features/auth/services/auth.service';
import { ProjectDetailComponent } from './features/projects/pages/project-detail/project-detail.component';
import { ProjectWorkflowsComponent } from './features/workflow/pages/project-workflows/project-workflows.component';
import { ProjectUsersComponent } from './features/projects/pages/project-users/project-users.component';
import { ProjectTramitesComponent } from './features/tramites/pages/project-tramites/project-tramites.component';
import { ProjectDepartmentsComponent } from './features/departments/pages/project-departments/project-departments.component';
import { WorkflowDesignerComponent } from './features/workflow/pages/workflow-designer/workflow-designer.component';
import { ProjectTicketsComponent } from './features/ticket/pages/project-tickets/project-tickets.component';
import { ProjectTaskDepartmentsComponent } from './features/tasks/pages/project-task-departments/project-task-departments.component';
import { DepartmentTasksComponent } from './features/tasks/pages/department-tasks/department-tasks.component';
import { TaskDetailComponent } from './features/tasks/pages/task-detail/task-detail.component';
import { DepartmentCompletedTasksComponent } from './features/tasks/pages/department-completed-tasks/department-completed-tasks.component';
import { TicketMonitorComponent } from './features/ticket/pages/ticket-monitor/ticket-monitor.component';
import { ProjectKpisComponent } from './features/projects/pages/project-kpis/project-kpis.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [
      () => {
        const auth = inject(AuthService);
        const router = inject(Router);
        const platformId = inject(PLATFORM_ID);

        if (!isPlatformBrowser(platformId)) {
          return true;
        }

        const token = auth.getToken();

        if (token) {
          return router.createUrlTree(['/dashboard']);
        }

        return true;
      },
    ],
  },
  { path: 'register', component: RegisterComponent },

  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

  { path: 'projects/:id', component: ProjectDetailComponent, canActivate: [authGuard] },

  { path: 'projects/:id/users', component: ProjectUsersComponent, canActivate: [authGuard] },

  { path: 'projects/:id/departments', component: ProjectDepartmentsComponent, canActivate: [authGuard] },

  { path: 'projects/:projectId/workflows/:workflowId/designer', component: WorkflowDesignerComponent, canActivate: [authGuard] },

  { path: 'projects/:id/tramites', component: ProjectTramitesComponent, canActivate: [authGuard] },

  { path: 'projects/:id/tickets/:ticketId/monitor', component: TicketMonitorComponent, canActivate: [authGuard] },

  { path: 'projects/:id/tickets', component: ProjectTicketsComponent, canActivate: [authGuard] },

  { path: 'projects/:id/kpis', component: ProjectKpisComponent, canActivate: [authGuard] },
  
  { path: 'projects/:id/tasks', component: ProjectTaskDepartmentsComponent, canActivate: [authGuard] },

  { path: 'projects/:id/tasks/departments/:departmentId', component: DepartmentTasksComponent, canActivate: [authGuard] },

  { path: 'projects/:id/tasks/:taskId', component: TaskDetailComponent, canActivate: [authGuard] }, 

  { path: 'projects/:id/tasks/departments/:departmentId/completed', component: DepartmentCompletedTasksComponent, canActivate: [authGuard] },

  { path: 'projects/:id/workflows', component: ProjectWorkflowsComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: 'login' },
];