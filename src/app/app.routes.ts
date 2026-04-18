import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Routes, Router } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { RegisterComponent } from './features/auth/pages/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { AuthService } from './features/auth/services/auth.service';
import { NodeInviteComponent } from './features/workflow/pages/node-invite/node-invite.component';
import { ProjectDetailComponent } from './features/projects/pages/project-detail/project-detail.component';
import { ProjectWorkflowsComponent } from './features/workflow/pages/project-workflows/project-workflows.component';
import { ProjectUsersComponent } from './features/projects/pages/project-users/project-users.component';
import { ProjectTramitesComponent } from './features/tramites/pages/project-tramites/project-tramites.component';

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

  { path: 'projects/:id/tramites', component: ProjectTramitesComponent, canActivate: [authGuard] },

  { path: 'projects/:id/workflows', component: ProjectWorkflowsComponent, canActivate: [authGuard] },

  { path: 'node-invite/:token', component: NodeInviteComponent },

  { path: '**', redirectTo: 'login' },
];