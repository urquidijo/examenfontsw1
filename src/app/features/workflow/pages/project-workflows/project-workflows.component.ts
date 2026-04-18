import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../../../projects/services/project.service';
import { WorkflowService } from '../../services/workflow.service';
import { Project } from '../../../projects/models/project.model';
import { WorkflowSummary } from '../../models/workflow.model';

@Component({
  selector: 'app-project-workflows',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './project-workflows.component.html',
})
export class ProjectWorkflowsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private workflowService = inject(WorkflowService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  projectId = '';
  project: Project | null = null;
  workflows: WorkflowSummary[] = [];

  loading = true;
  creating = false;
  deletingWorkflowId: string | null = null;
  errorMessage = '';
  successMessage = '';

  workflowForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
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

    this.projectService.getProjectById(this.projectId).subscribe({
      next: (project) => {
        this.project = project;

        this.workflowService.getWorkflows(this.projectId).subscribe({
          next: (workflows) => {
            this.workflows = workflows ?? [];
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.loading = false;
            this.errorMessage = error?.error?.message || 'No se pudieron cargar los workflows';
            this.cdr.detectChanges();
          },
        });
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar el proyecto';
        this.cdr.detectChanges();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId]);
  }

  createWorkflow(): void {
    if (this.workflowForm.invalid) {
      this.workflowForm.markAllAsTouched();
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.workflowService.createWorkflow(this.projectId, this.workflowForm.getRawValue()).subscribe({
      next: (workflow) => {
        this.workflows = [workflow, ...this.workflows];
        this.creating = false;
        this.successMessage = 'Workflow creado correctamente';
        this.workflowForm.reset({
          name: '',
          description: '',
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.creating = false;
        this.errorMessage = error?.error?.message || 'No se pudo crear el workflow';
        this.cdr.detectChanges();
      },
    });
  }

  openDesigner(workflowId: string): void {
    this.router.navigate(['/projects', this.projectId, 'workflows', workflowId, 'designer']);
  }

  deleteWorkflow(workflowId: string): void {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este workflow?');

    if (!confirmed) {
      return;
    }

    this.deletingWorkflowId = workflowId;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.workflowService.deleteWorkflow(this.projectId, workflowId).subscribe({
      next: (response) => {
        this.workflows = this.workflows.filter((workflow) => workflow.id !== workflowId);
        this.deletingWorkflowId = null;
        this.successMessage = response?.message || 'Workflow eliminado correctamente';
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.deletingWorkflowId = null;
        this.errorMessage = error?.error?.message || 'No se pudo eliminar el workflow';
        this.cdr.detectChanges();
      },
    });
  }

  changeWorkflowStatus(workflowId: string, status: 'DRAFT' | 'PUBLISHED'): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.workflowService.updateWorkflowStatus(this.projectId, workflowId, status).subscribe({
      next: (updated) => {
        this.workflows = this.workflows.map((item) => (item.id === updated.id ? updated : item));

        this.successMessage =
          status === 'PUBLISHED'
            ? 'Workflow puesto en producción correctamente'
            : 'Workflow devuelto a desarrollo correctamente';

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'No se pudo cambiar el estado del workflow';
        this.cdr.detectChanges();
      },
    });
  }
}
