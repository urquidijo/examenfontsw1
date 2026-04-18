import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../../projects/services/project.service';
import { Project } from '../../../projects/models/project.model';
import { DepartmentService } from '../../services/department.service';
import { Department } from '../../models/department.model';
import { ProjectUserService } from '../../../projects/services/project-user.service';
import { ProjectMember } from '../../../projects/models/project-user.model';
import { TramiteService } from '../../../tramites/services/tramite.service';
import { TramiteTemplate } from '../../../tramites/models/tramite.model';

@Component({
  selector: 'app-project-departments',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './project-departments.component.html',
})
export class ProjectDepartmentsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private projectService = inject(ProjectService);
  private departmentService = inject(DepartmentService);
  private projectUserService = inject(ProjectUserService);
  private tramiteService = inject(TramiteService);

  projectId = '';
  project: Project | null = null;

  departments: Department[] = [];
  projectMembers: ProjectMember[] = [];
  tramites: TramiteTemplate[] = [];

  loading = true;
  saving = false;
  deletingDepartmentId: string | null = null;

  showForm = false;
  editingDepartmentId: string | null = null;

  errorMessage = '';
  successMessage = '';

  memberSearch = '';

  departmentForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    assignedUserIds: [[] as string[]],
    requiresTramite: [false],
    tramiteTemplateId: [''],
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
      departments: this.departmentService.getDepartments(this.projectId),
      members: this.projectUserService.getProjectMembers(this.projectId),
      tramites: this.tramiteService.getTramites(this.projectId),
    }).subscribe({
      next: ({ project, departments, members, tramites }) => {
        this.project = project;
        this.departments = departments ?? [];
        this.projectMembers = members ?? [];
        this.tramites = (tramites ?? []).filter((item) => item.active);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los departamentos';
        this.cdr.detectChanges();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId]);
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.showForm) {
      this.resetForm();
    }
  }

  onRequiresTramiteChange(): void {
    const requiresTramite = !!this.departmentForm.get('requiresTramite')?.value;

    if (!requiresTramite) {
      this.departmentForm.patchValue({
        tramiteTemplateId: '',
      });
    }

    this.cdr.detectChanges();
  }

  onMemberSearchInput(event: Event): void {
    this.memberSearch = (event.target as HTMLInputElement).value;
    this.cdr.detectChanges();
  }

  toggleAssignedUser(userId: string): void {
    const current = [...(this.departmentForm.get('assignedUserIds')?.value ?? [])];
    const exists = current.includes(userId);

    const updated = exists
      ? current.filter((id) => id !== userId)
      : [...current, userId];

    this.departmentForm.patchValue({
      assignedUserIds: updated,
    });

    this.cdr.detectChanges();
  }

  isAssignedUser(userId: string): boolean {
    const current = this.departmentForm.get('assignedUserIds')?.value ?? [];
    return current.includes(userId);
  }

  removeAssignedUser(userId: string): void {
    const current = [...(this.departmentForm.get('assignedUserIds')?.value ?? [])];
    this.departmentForm.patchValue({
      assignedUserIds: current.filter((id) => id !== userId),
    });
    this.cdr.detectChanges();
  }

  get filteredMembers(): ProjectMember[] {
    const search = this.memberSearch.trim().toLowerCase();

    if (!search) {
      return this.projectMembers;
    }

    return this.projectMembers.filter((member) => {
      const name = member.name?.toLowerCase() || '';
      const email = member.email?.toLowerCase() || '';
      const role = member.role?.toLowerCase() || '';
      return name.includes(search) || email.includes(search) || role.includes(search);
    });
  }

  get selectedMembers(): ProjectMember[] {
    const ids = this.departmentForm.get('assignedUserIds')?.value ?? [];
    return this.projectMembers.filter((member) => ids.includes(member.userId));
  }

  editDepartment(department: Department): void {
    this.showForm = true;
    this.editingDepartmentId = department.id;
    this.errorMessage = '';
    this.successMessage = '';
    this.memberSearch = '';

    this.departmentForm.patchValue({
      name: department.name,
      description: department.description || '',
      assignedUserIds: department.assignedUserIds || [],
      requiresTramite: department.requiresTramite,
      tramiteTemplateId: department.tramiteTemplateId || '',
    });

    this.cdr.detectChanges();
  }

  saveDepartment(): void {
    if (this.departmentForm.invalid) {
      this.departmentForm.markAllAsTouched();
      return;
    }

    const raw = this.departmentForm.getRawValue();
    const requiresTramite = !!raw.requiresTramite;

    const payload = {
      name: String(raw.name || '').trim(),
      description: String(raw.description || '').trim(),
      assignedUserIds: raw.assignedUserIds ?? [],
      requiresTramite,
      tramiteTemplateId: requiresTramite
        ? String(raw.tramiteTemplateId || '').trim() || null
        : null,
    };

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request$ = this.editingDepartmentId
      ? this.departmentService.updateDepartment(this.projectId, this.editingDepartmentId, payload)
      : this.departmentService.createDepartment(this.projectId, payload);

    request$.subscribe({
      next: (department) => {
        this.saving = false;

        if (this.editingDepartmentId) {
          this.departments = this.departments.map((item) =>
            item.id === department.id ? department : item
          );
          this.successMessage = 'Departamento actualizado correctamente';
        } else {
          this.departments = [department, ...this.departments];
          this.successMessage = 'Departamento creado correctamente';
        }

        this.resetForm();
        this.showForm = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar el departamento';
        this.cdr.detectChanges();
      },
    });
  }

  deleteDepartment(departmentId: string): void {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este departamento?');

    if (!confirmed) {
      return;
    }

    this.deletingDepartmentId = departmentId;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.departmentService.deleteDepartment(this.projectId, departmentId).subscribe({
      next: (response) => {
        this.departments = this.departments.filter((item) => item.id !== departmentId);
        this.deletingDepartmentId = null;
        this.successMessage = response?.message || 'Departamento eliminado correctamente';
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.deletingDepartmentId = null;
        this.errorMessage = error?.error?.message || 'No se pudo eliminar el departamento';
        this.cdr.detectChanges();
      },
    });
  }

  cancelEdit(): void {
    this.resetForm();
    this.showForm = false;
    this.cdr.detectChanges();
  }

  private resetForm(): void {
    this.editingDepartmentId = null;
    this.memberSearch = '';
    this.departmentForm.reset({
      name: '',
      description: '',
      assignedUserIds: [],
      requiresTramite: false,
      tramiteTemplateId: '',
    });
  }

  getAssignedUsersPreview(department: Department): string {
    if (!department.assignedUsers || department.assignedUsers.length === 0) {
      return 'Sin encargados';
    }

    return department.assignedUsers.map((user) => user.name).join(', ');
  }
}