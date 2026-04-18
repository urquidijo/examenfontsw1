import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { ProjectService } from '../projects/services/project.service';
import { ProjectSummary } from '../projects/models/project.model';
import { ProjectUserService } from '../projects/services/project-user.service';
import { ProjectInvitation } from '../projects/models/project-user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private projectUserService = inject(ProjectUserService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  user: any = null;

  myProjects: ProjectSummary[] = [];
  ownedProjects: ProjectSummary[] = [];
  sharedProjects: ProjectSummary[] = [];

  invitations: ProjectInvitation[] = [];

  activeTab: 'all' | 'owned' | 'shared' = 'all';

  loadingProjects = false;
  loadingInvitations = false;
  creatingProject = false;
  deletingProjectId: string | null = null;
  processingInvitationId: string | null = null;

  showCreateForm = false;

  projectErrorMessage = '';
  projectSuccessMessage = '';
  invitationErrorMessage = '';
  invitationSuccessMessage = '';

  projectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loadProjects();
    this.loadInvitations();
  }

  loadProjects(): void {
    this.loadingProjects = true;
    this.projectErrorMessage = '';

    forkJoin({
      my: this.projectService.getMyProjects(),
      owned: this.projectService.getOwnedProjects(),
      shared: this.projectService.getSharedProjects(),
    }).subscribe({
      next: ({ my, owned, shared }) => {
        this.myProjects = my ?? [];
        this.ownedProjects = owned ?? [];
        this.sharedProjects = shared ?? [];
        this.loadingProjects = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loadingProjects = false;
        this.projectErrorMessage = error?.error?.message || 'No se pudieron cargar los proyectos';
        this.cdr.detectChanges();
      },
    });
  }

  loadInvitations(): void {
    this.loadingInvitations = true;
    this.invitationErrorMessage = '';

    this.projectUserService.getMyPendingInvitations().subscribe({
      next: (invitations) => {
        this.invitations = invitations ?? [];
        this.loadingInvitations = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loadingInvitations = false;
        this.invitationErrorMessage =
          error?.error?.message || 'No se pudieron cargar las invitaciones';
        this.cdr.detectChanges();
      },
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.projectErrorMessage = '';
    this.projectSuccessMessage = '';

    if (!this.showCreateForm) {
      this.projectForm.reset({
        name: '',
        description: '',
      });
    }
  }

  openProject(projectId: string): void {
    this.router.navigate(['/projects', projectId]);
  }

  private addProjectToLists(project: ProjectSummary): void {
    this.myProjects = [project, ...this.myProjects];

    if (project.role === 'ADMINISTRADOR') {
      this.ownedProjects = [project, ...this.ownedProjects];
    }

    if (project.role === 'FUNCIONARIO') {
      this.sharedProjects = [project, ...this.sharedProjects];
    }

    this.cdr.detectChanges();
  }

  private removeProjectFromLists(projectId: string): void {
    this.myProjects = this.myProjects.filter((project) => project.projectId !== projectId);
    this.ownedProjects = this.ownedProjects.filter((project) => project.projectId !== projectId);
    this.sharedProjects = this.sharedProjects.filter((project) => project.projectId !== projectId);
    this.cdr.detectChanges();
  }

  setTab(tab: 'all' | 'owned' | 'shared'): void {
    this.activeTab = tab;
    this.projectSuccessMessage = '';
    this.projectErrorMessage = '';
  }

  createProject(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.creatingProject = true;
    this.projectErrorMessage = '';
    this.projectSuccessMessage = '';

    this.projectService.createProject(this.projectForm.getRawValue()).subscribe({
      next: (createdProject) => {
        this.creatingProject = false;
        this.projectSuccessMessage = 'Proyecto creado correctamente';

        const projectToAdd: ProjectSummary = {
          projectId: createdProject.id,
          name: createdProject.name,
          description: createdProject.description ?? '',
          role: 'ADMINISTRADOR',
        };

        this.addProjectToLists(projectToAdd);

        this.projectForm.reset({
          name: '',
          description: '',
        });

        this.showCreateForm = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.creatingProject = false;
        this.projectErrorMessage = error?.error?.message || 'No se pudo crear el proyecto';
        this.cdr.detectChanges();
      },
    });
  }

  deleteProject(projectId: string): void {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este proyecto?');

    if (!confirmed) {
      return;
    }

    this.deletingProjectId = projectId;
    this.projectErrorMessage = '';
    this.projectSuccessMessage = '';
    this.cdr.detectChanges();

    this.projectService.deleteProject(projectId).subscribe({
      next: (response) => {
        this.deletingProjectId = null;
        this.projectSuccessMessage = response?.message || 'Proyecto eliminado correctamente';
        this.removeProjectFromLists(projectId);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.deletingProjectId = null;
        this.projectErrorMessage = error?.error?.message || 'No se pudo eliminar el proyecto';
        this.cdr.detectChanges();
      },
    });
  }

  acceptInvitation(invitationId: string): void {
    this.processingInvitationId = invitationId;
    this.invitationErrorMessage = '';
    this.invitationSuccessMessage = '';
    this.cdr.detectChanges();

    this.projectUserService.acceptInvitation(invitationId).subscribe({
      next: (response) => {
        this.processingInvitationId = null;
        this.invitationSuccessMessage = response?.message || 'Invitación aceptada correctamente';
        this.invitations = this.invitations.filter((item) => item.id !== invitationId);
        this.loadProjects();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.processingInvitationId = null;
        this.invitationErrorMessage =
          error?.error?.message || 'No se pudo aceptar la invitación';
        this.cdr.detectChanges();
      },
    });
  }

  rejectInvitation(invitationId: string): void {
    this.processingInvitationId = invitationId;
    this.invitationErrorMessage = '';
    this.invitationSuccessMessage = '';
    this.cdr.detectChanges();

    this.projectUserService.rejectInvitation(invitationId).subscribe({
      next: (response) => {
        this.processingInvitationId = null;
        this.invitationSuccessMessage = response?.message || 'Invitación rechazada correctamente';
        this.invitations = this.invitations.filter((item) => item.id !== invitationId);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.processingInvitationId = null;
        this.invitationErrorMessage =
          error?.error?.message || 'No se pudo rechazar la invitación';
        this.cdr.detectChanges();
      },
    });
  }

  getVisibleProjects(): ProjectSummary[] {
    if (this.activeTab === 'owned') return this.ownedProjects;
    if (this.activeTab === 'shared') return this.sharedProjects;
    return this.myProjects;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}