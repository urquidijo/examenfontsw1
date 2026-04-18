import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../../projects/services/project.service';
import { Project } from '../../../projects/models/project.model';
import { TramiteService } from '../../services/tramite.service';
import { TramiteFieldType, TramiteTemplate } from '../../models/tramite.model';

@Component({
  selector: 'app-project-tramites',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './project-tramites.component.html',
})
export class ProjectTramitesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private projectService = inject(ProjectService);
  private tramiteService = inject(TramiteService);

  projectId = '';
  project: Project | null = null;

  tramites: TramiteTemplate[] = [];

  loading = true;
  saving = false;
  deletingTramiteId: string | null = null;

  showForm = false;
  editingTramiteId: string | null = null;

  errorMessage = '';
  successMessage = '';

  fieldTypes: TramiteFieldType[] = [
    'TEXT',
    'TEXTAREA',
    'NUMBER',
    'DATE',
    'SELECT',
    'CHECKBOX',
    'FILE',
  ];

  tramiteForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    active: [true, [Validators.required]],
    fields: this.fb.array([]),
  });

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.loadData();
  }

  get fieldsArray(): FormArray {
    return this.tramiteForm.get('fields') as FormArray;
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
      tramites: this.tramiteService.getTramites(this.projectId),
    }).subscribe({
      next: ({ project, tramites }) => {
        this.project = project;
        this.tramites = tramites ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudieron cargar los trámites';
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

  private buildFieldGroup(field?: any): FormGroup {
    return this.fb.group({
      id: [field?.id || this.generateFieldId()],
      label: [field?.label || '', [Validators.required]],
      type: [field?.type || 'TEXT', [Validators.required]],
      required: [field?.required ?? false],
      placeholder: [field?.placeholder || ''],
      optionsText: [(field?.options || []).join(', ')],
    });
  }

  addField(field?: any): void {
    this.fieldsArray.push(this.buildFieldGroup(field));
    this.cdr.detectChanges();
  }

  removeField(index: number): void {
    this.fieldsArray.removeAt(index);
    this.cdr.detectChanges();
  }

  editTramite(tramite: TramiteTemplate): void {
    this.showForm = true;
    this.editingTramiteId = tramite.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.tramiteForm.patchValue({
      name: tramite.name,
      description: tramite.description,
      active: tramite.active,
    });

    this.fieldsArray.clear();

    for (const field of tramite.fields || []) {
      this.addField(field);
    }

    this.cdr.detectChanges();
  }

  saveTramite(): void {
    if (this.tramiteForm.invalid) {
      this.tramiteForm.markAllAsTouched();
      return;
    }

    const raw = this.tramiteForm.getRawValue();

    const fields = (raw.fields || []).map((field: any) => {
      const type = field.type;
      const options =
        type === 'SELECT'
          ? String(field.optionsText || '')
              .split(',')
              .map((item) => item.trim())
              .filter((item) => !!item)
          : [];

      return {
        id: field.id || this.generateFieldId(),
        label: String(field.label || '').trim(),
        type,
        required: !!field.required,
        placeholder: String(field.placeholder || '').trim(),
        ...(type === 'SELECT' ? { options } : {}),
      };
    });

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      name: String(raw.name || '').trim(),
      description: String(raw.description || '').trim(),
      active: !!raw.active,
      fields,
    };

    const request$ = this.editingTramiteId
      ? this.tramiteService.updateTramite(this.projectId, this.editingTramiteId, payload)
      : this.tramiteService.createTramite(this.projectId, payload);

    request$.subscribe({
      next: (tramite) => {
        this.saving = false;

        if (this.editingTramiteId) {
          this.tramites = this.tramites.map((item) =>
            item.id === tramite.id ? tramite : item
          );
          this.successMessage = 'Trámite actualizado correctamente';
        } else {
          this.tramites = [tramite, ...this.tramites];
          this.successMessage = 'Trámite creado correctamente';
        }

        this.resetForm();
        this.showForm = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'No se pudo guardar el trámite';
        this.cdr.detectChanges();
      },
    });
  }

  deleteTramite(tramiteId: string): void {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este trámite?');

    if (!confirmed) {
      return;
    }

    this.deletingTramiteId = tramiteId;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.tramiteService.deleteTramite(this.projectId, tramiteId).subscribe({
      next: (response) => {
        this.tramites = this.tramites.filter((item) => item.id !== tramiteId);
        this.deletingTramiteId = null;
        this.successMessage = response?.message || 'Trámite eliminado correctamente';
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.deletingTramiteId = null;
        this.errorMessage = error?.error?.message || 'No se pudo eliminar el trámite';
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
    this.editingTramiteId = null;
    this.tramiteForm.reset({
      name: '',
      description: '',
      active: true,
      fields: [],
    });

    this.fieldsArray.clear();
  }

  private generateFieldId(): string {
    return `field_${Math.random().toString(36).slice(2, 10)}`;
  }

  isSelectField(index: number): boolean {
    const group = this.fieldsArray.at(index) as FormGroup;
    return group.get('type')?.value === 'SELECT';
  }
}