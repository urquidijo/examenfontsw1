import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { TaskService } from '../../services/task.service';
import { DecisionOption, WorkflowTask } from '../../models/task.model';
import { TramiteService } from '../../../tramites/services/tramite.service';
import { TramiteField, TramiteTemplate } from '../../../tramites/models/tramite.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TicketService } from '../../../ticket/services/ticket.service';
import { StoredFileInfo } from '../../models/task.model';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './task-detail.component.html',
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);
  private tramiteService = inject(TramiteService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private ticketService = inject(TicketService);

  selectedFiles: File[] = [];
  selectedFilesByField: Record<string, File[]> = {};

  projectId = '';
  taskId = '';

  task: WorkflowTask | null = null;
  tramiteTemplate: TramiteTemplate | null = null;
  tramiteForm: FormGroup = this.fb.group({});

  loading = true;
  completing = false;
  loadingTramite = false;
  errorMessage = '';

  selectedDecisionResult = '';

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.taskId = this.route.snapshot.paramMap.get('taskId') || '';
    this.loadData();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    this.selectedFiles = Array.from(input.files);
  }

  onFieldFilesSelected(fieldId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];

    this.selectedFilesByField[fieldId] = files;

    const control = this.tramiteForm.get(fieldId);
    if (control) {
      control.setValue(files.length > 0 ? files.map((f) => f.name) : null);
      control.markAsTouched();
      control.updateValueAndValidity();
    }
  }

  downloadTicketFile(file: StoredFileInfo): void {
    const ticketId = this.task?.ticket?.id;
    if (!ticketId) return;

    this.ticketService.downloadTicketFile(this.projectId, ticketId, file.key).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) return;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.originalName || 'archivo';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo descargar el archivo del ticket';
        this.cdr.detectChanges();
      },
    });
  }

  getFilesForField(fieldId: string): File[] {
    return this.selectedFilesByField[fieldId] || [];
  }

  loadData(): void {
    this.loading = true;
    this.loadingTramite = false;
    this.errorMessage = '';
    this.selectedDecisionResult = '';
    this.selectedFiles = [];

    this.taskService.getTaskDetail(this.projectId, this.taskId).subscribe({
      next: (task) => {
        this.task = task;

        if (task.requiresTramite && task.tramiteTemplateId) {
          this.loadingTramite = true;

          this.tramiteService.getTramiteById(this.projectId, task.tramiteTemplateId).subscribe({
            next: (template) => {
              this.tramiteTemplate = template;
              this.buildDynamicForm(template.fields || []);
              this.loading = false;
              this.loadingTramite = false;
              this.cdr.detectChanges();
            },
            error: (error) => {
              this.loading = false;
              this.loadingTramite = false;
              this.errorMessage =
                error?.error?.message || 'No se pudo cargar el formulario del trámite';
              this.cdr.detectChanges();
            },
          });

          return;
        }

        this.tramiteTemplate = null;
        this.tramiteForm = this.fb.group({});
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar la tarea';
        this.cdr.detectChanges();
      },
    });
  }

  buildDynamicForm(fields: TramiteField[]): void {
    const controls: Record<string, FormControl> = {};

    for (const field of fields) {
      const validators = field.required ? [Validators.required] : [];
      let initialValue: any = '';

      if (field.type === 'CHECKBOX') {
        initialValue = false;
      }

      if (field.type === 'FILE') {
        initialValue = null;
      }

      controls[field.id] = this.fb.control(initialValue, validators) as FormControl;
    }

    this.tramiteForm = this.fb.group(controls);
  }

  goBack(): void {
    if (!this.task?.departmentId) {
      this.router.navigate(['/projects', this.projectId, 'tasks']);
      return;
    }

    this.router.navigate([
      '/projects',
      this.projectId,
      'tasks',
      'departments',
      this.task.departmentId,
    ]);
  }

  get isDecisionTask(): boolean {
    return this.task?.nodeType === 'decision';
  }

  get decisionOptions(): DecisionOption[] {
    return this.task?.decisionOptions ?? [];
  }

  requestCompleteTask(): void {
    if (!this.task) return;

    if (this.task.requiresTramite) {
      if (!this.tramiteTemplate) {
        this.errorMessage = 'No se pudo cargar la plantilla del trámite';
        this.cdr.detectChanges();
        return;
      }

      if (this.tramiteForm.invalid) {
        this.tramiteForm.markAllAsTouched();
        this.errorMessage = 'Completa los campos obligatorios del trámite';
        this.cdr.detectChanges();
        return;
      }
    }

    if (this.isDecisionTask && !this.selectedDecisionResult) {
      this.errorMessage = 'Debes seleccionar una opción para la decisión';
      this.cdr.detectChanges();
      return;
    }

    const dialogData: ConfirmDialogData = {
      title: 'Completar tarea',
      message: '¿Deseas completar esta tarea y enviarla a la siguiente etapa?',
      confirmText: 'Sí, completar',
      cancelText: 'Cancelar',
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      disableClose: true,
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.completeTask();
      }
    });
  }

  completeTask(): void {
    if (!this.task) return;

    let tramiteData: Record<string, any> | undefined = undefined;

    if (this.task.requiresTramite) {
      tramiteData = this.tramiteForm.getRawValue();
    }

    const files = Object.values(this.selectedFilesByField).flat();

    this.completing = true;
    this.errorMessage = '';

    this.taskService
      .completeTask(
        this.projectId,
        this.task.id,
        {
          tramiteData,
          decisionResult: this.isDecisionTask ? this.selectedDecisionResult : undefined,
        },
        files,
      )
      .subscribe({
        next: () => {
          this.completing = false;
          this.goBack();
        },
        error: (error) => {
          this.completing = false;
          this.errorMessage = error?.error?.message || 'No se pudo completar la tarea';
          this.cdr.detectChanges();
        },
      });
  }

  isFieldInvalid(fieldId: string): boolean {
    const control = this.tramiteForm.get(fieldId);
    return !!control && control.invalid && (control.touched || control.dirty);
  }
  
  getTaskStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'IN_PROGRESS':
        return 'En proceso';
      case 'DONE':
        return 'Completada';
      default:
        return status;
    }
  }

  isDecisionInvalid(): boolean {
    return this.isDecisionTask && !this.selectedDecisionResult;
  }
}
