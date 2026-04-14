import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Routes, Router } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { RegisterComponent } from './features/auth/pages/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { AuthService } from './features/auth/services/auth.service';
import { WorkflowDesignerComponent } from './features/workflow/pages/workflow-designer/workflow-designer.component';
import { NodeInviteComponent } from './features/workflow/pages/node-invite/node-invite.component';

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
  { path: 'projects/:id/designer', component: WorkflowDesignerComponent, canActivate: [authGuard] },

  { path: 'node-invite/:token', component: NodeInviteComponent },

  { path: '**', redirectTo: 'login' },
];