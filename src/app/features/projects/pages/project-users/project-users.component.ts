import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { ProjectUserService } from '../../services/project-user.service';
import {
  ProjectInvitation,
  ProjectMember,
  ProjectRole,
} from '../../models/project-user.model';

@Component({
  selector: 'app-project-users',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './project-users.component.html',
})
export class ProjectUsersComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private projectService = inject(ProjectService);
  private projectUserService = inject(ProjectUserService);

  projectId = '';
  project: Project | null = null;

  members: ProjectMember[] = [];
  invitations: ProjectInvitation[] = [];

  loading = true;
  inviting = false;
  errorMessage = '';
  successMessage = '';

  roles: ProjectRole[] = ['ADMINISTRADOR', 'FUNCIONARIO'];

  inviteForm = this.fb.nonNullable.group({
    email: [''],
    name: [''],
    role: ['FUNCIONARIO' as ProjectRole, [Validators.required]],
  });

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.loadData();
  }

  loadData(): void {
    if (!this.projectId) {
      this.loading = false;
      this.errorMessage = 'Proyecto no encontrado';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    forkJoin({
      project: this.projectService.getProjectById(this.projectId),
      members: this.projectUserService.getProjectMembers(this.projectId),
      invitations: this.projectUserService.getProjectInvitations(this.projectId),
    }).subscribe({
      next: ({ project, members, invitations }) => {
        this.project = project;
        this.members = members ?? [];
        this.invitations = invitations ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar la gestión de usuarios';
        this.cdr.detectChanges();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId]);
  }

  inviteUser(): void {
    const raw = this.inviteForm.getRawValue();
    const email = raw.email.trim();
    const name = raw.name.trim();

    if (!email && !name) {
      this.errorMessage = 'Debes ingresar correo o nombre del usuario';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    this.inviting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.projectUserService
      .createInvitation(this.projectId, {
        email: email || undefined,
        name: name || undefined,
        role: raw.role,
      })
      .subscribe({
        next: (response) => {
          this.inviting = false;
          this.successMessage = response?.message || 'Invitación enviada correctamente';
          this.inviteForm.reset({
            email: '',
            name: '',
            role: 'FUNCIONARIO',
          });
          this.loadInvitationsOnly();
        },
        error: (error) => {
          this.inviting = false;
          this.errorMessage = error?.error?.message || 'No se pudo enviar la invitación';
          this.cdr.detectChanges();
        },
      });
  }

  loadInvitationsOnly(): void {
    this.projectUserService.getProjectInvitations(this.projectId).subscribe({
      next: (invitations) => {
        this.invitations = invitations ?? [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  get pendingInvitations(): ProjectInvitation[] {
    return this.invitations.filter((invitation) => invitation.status === 'PENDIENTE');
  }

  get processedInvitations(): ProjectInvitation[] {
    return this.invitations.filter((invitation) => invitation.status !== 'PENDIENTE');
  }
}