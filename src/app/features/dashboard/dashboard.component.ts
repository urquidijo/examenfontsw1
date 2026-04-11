import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { ProjectService } from '../projects/services/project.service';
import { ProjectSummary } from '../projects/models/project.model';

type InviteFormType = FormGroup<{
  email: ReturnType<FormBuilder['nonNullable']['control']>;
}>;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  user: any = null;

  myProjects: ProjectSummary[] = [];
  ownedProjects: ProjectSummary[] = [];
  sharedProjects: ProjectSummary[] = [];

  activeTab: 'all' | 'owned' | 'shared' = 'all';

  loadingProjects = false;
  creatingProject = false;
  invitingProjectId: string | null = null;
  deletingProjectId: string | null = null;

  projectErrorMessage = '';
  projectSuccessMessage = '';
  inviteMessages: Record<string, string> = {};

  projectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  inviteForms: Record<string, InviteFormType> = {};

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadProjects();
  }

  openDesigner(projectId: string): void {
    this.router.navigate(['/projects', projectId, 'designer']);
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
        this.ensureInviteForms(this.ownedProjects);
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

  ensureInviteForms(projects: ProjectSummary[]): void {
    for (const project of projects) {
      if (!this.inviteForms[project.projectId]) {
        this.inviteForms[project.projectId] = this.fb.nonNullable.group({
          email: ['', [Validators.required, Validators.email]],
        }) as InviteFormType;
      }
    }
  }

  private addProjectToLists(project: ProjectSummary): void {
    this.myProjects = [project, ...this.myProjects];

    if (project.role === 'ADMINISTRADOR') {
      this.ownedProjects = [project, ...this.ownedProjects];
      this.ensureInviteForms([project]);
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

    delete this.inviteForms[projectId];
    delete this.inviteMessages[projectId];

    if (this.invitingProjectId === projectId) {
      this.invitingProjectId = null;
    }

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

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.creatingProject = false;
        this.projectErrorMessage = error?.error?.message || 'No se pudo crear el proyecto';
        this.cdr.detectChanges();
      },
    });
  }

  toggleInvite(projectId: string): void {
    this.invitingProjectId = this.invitingProjectId === projectId ? null : projectId;
    this.inviteMessages[projectId] = '';
    this.cdr.detectChanges();
  }

  inviteUser(projectId: string): void {
    const form = this.inviteForms[projectId];

    if (!form) {
      return;
    }

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const email = String(form.controls.email.value ?? '');

    this.inviteMessages[projectId] = 'Enviando invitación...';
    this.cdr.detectChanges();

    this.projectService.inviteUser(projectId, { email }).subscribe({
      next: (response) => {
        this.inviteMessages[projectId] = response?.message || 'Usuario invitado correctamente';
        form.reset({ email: '' });
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.inviteMessages[projectId] = error?.error?.message || 'No se pudo invitar al usuario';
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
