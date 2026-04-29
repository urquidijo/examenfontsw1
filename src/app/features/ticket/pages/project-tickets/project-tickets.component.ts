import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, take, timeout } from 'rxjs/operators';

import { ProjectService } from '../../../projects/services/project.service';
import { WorkflowService } from '../../../workflow/services/workflow.service';
import { TicketService } from '../../services/ticket.service';

import { Project } from '../../../projects/models/project.model';
import { WorkflowSummary } from '../../../workflow/models/workflow.model';
import { Ticket } from '../../models/ticket.model';

type VisibleTicketStatus = 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

@Component({
  selector: 'app-project-tickets',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './project-tickets.component.html',
})
export class ProjectTicketsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private workflowService = inject(WorkflowService);
  private ticketService = inject(TicketService);

  projectId = '';
  project: Project | null = null;

  tickets: Ticket[] = [];
  filteredTicketsCache: Ticket[] = [];

  publishedWorkflows: WorkflowSummary[] = [];
  workflowFilterOptions: Array<{ id: string; name: string }> = [];
  departmentFilterOptions: Array<{ id: string; name: string }> = [];

  loading = true;
  saving = false;
  showForm = false;

  errorMessage = '';
  successMessage = '';

  selectedFiles: File[] = [];

  searchTerm = '';
  selectedStatus: '' | VisibleTicketStatus = '';
  selectedWorkflowId = '';
  selectedDepartmentId = '';

  ticketForm = this.fb.nonNullable.group({
    workflowId: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    clientName: [''],
    clientPhone: [''],
    clientEmail: [''],
    clientReference: [''],
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
      project: this.projectService.getProjectById(this.projectId).pipe(
        take(1),
        timeout(15000),
        catchError((error) => {
          console.error('Error cargando proyecto:', error);
          return of(null);
        }),
      ),
      workflows: this.workflowService.getWorkflows(this.projectId).pipe(
        take(1),
        timeout(15000),
        catchError((error) => {
          console.error('Error cargando workflows:', error);
          return of([]);
        }),
      ),
      tickets: this.ticketService.getTickets(this.projectId).pipe(
        take(1),
        timeout(15000),
        catchError((error) => {
          console.error('Error cargando tickets:', error);
          return of([]);
        }),
      ),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: ({ project, workflows, tickets }) => {
          if (!project) {
            this.errorMessage = 'No se pudo cargar el proyecto. Revisa consola o backend.';
            this.project = null;
            this.tickets = [];
            this.filteredTicketsCache = [];
            return;
          }

          this.project = project;

          this.publishedWorkflows = (workflows ?? []).filter(
            (item: WorkflowSummary) => item.status === 'PUBLISHED',
          );

          this.tickets = tickets ?? [];
          this.rebuildFilterOptions();
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error general cargando pantalla:', error);
          this.errorMessage = 'No se pudo cargar la gestión de tickets';
          this.loading = false;
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

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    this.selectedFiles = Array.from(input.files);
  }

  createTicket(): void {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.ticketService
      .createTicket(this.projectId, this.ticketForm.getRawValue(), this.selectedFiles)
      .pipe(
        take(1),
        timeout(15000),
        finalize(() => {
          this.saving = false;
        }),
      )
      .subscribe({
        next: (ticket) => {
          this.tickets = [ticket, ...this.tickets];
          this.rebuildFilterOptions();
          this.applyFilters();
          this.successMessage = 'Ticket creado correctamente';
          this.showForm = false;
          this.resetForm();
        },
        error: (error) => {
          console.error('Error creando ticket:', error);
          this.errorMessage = error?.error?.message || 'No se pudo crear el ticket';
        },
      });
  }

  resetForm(): void {
    this.ticketForm.reset({
      workflowId: '',
      title: '',
      description: '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      clientReference: '',
    });

    this.selectedFiles = [];
  }

  goToMonitor(ticketId: string): void {
    this.router.navigate(['/projects', this.projectId, 'tickets', ticketId, 'monitor']);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedWorkflowId = '';
    this.selectedDepartmentId = '';
    this.applyFilters();
  }

  onFiltersChange(): void {
    this.applyFilters();
  }

  private rebuildFilterOptions(): void {
    const workflowMap = new Map<string, string>();
    const departmentMap = new Map<string, string>();

    for (const ticket of this.tickets) {
      if (ticket.workflowId && ticket.workflowName) {
        workflowMap.set(ticket.workflowId, ticket.workflowName);
      }

      if (ticket.currentDepartmentId && ticket.currentDepartmentName) {
        departmentMap.set(ticket.currentDepartmentId, ticket.currentDepartmentName);
      }
    }

    this.workflowFilterOptions = Array.from(workflowMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));

    this.departmentFilterOptions = Array.from(departmentMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }

  applyFilters(): void {
    const query = this.normalizeText(this.searchTerm);

    this.filteredTicketsCache = this.tickets.filter((ticket) => {
      const visibleStatus = this.normalizeTicketStatus(ticket.status as string);

      const matchesSearch =
        !query ||
        this.normalizeText(ticket.title).includes(query) ||
        this.normalizeText(ticket.description).includes(query) ||
        this.normalizeText(ticket.workflowName).includes(query) ||
        this.normalizeText(ticket.clientName).includes(query) ||
        this.normalizeText(ticket.clientEmail).includes(query) ||
        this.normalizeText(ticket.clientPhone).includes(query) ||
        this.normalizeText(ticket.clientReference).includes(query) ||
        this.normalizeText(ticket.currentDepartmentName).includes(query);

      const matchesStatus =
        !this.selectedStatus || visibleStatus === this.selectedStatus;

      const matchesWorkflow =
        !this.selectedWorkflowId || ticket.workflowId === this.selectedWorkflowId;

      const matchesDepartment =
        !this.selectedDepartmentId || ticket.currentDepartmentId === this.selectedDepartmentId;

      return matchesSearch && matchesStatus && matchesWorkflow && matchesDepartment;
    });
  }

  getStatusLabel(status: string): string {
    const visibleStatus = this.normalizeTicketStatus(status);

    switch (visibleStatus) {
      case 'IN_PROGRESS':
        return 'En proceso';
      case 'COMPLETED':
        return 'Completado';
      case 'REJECTED':
        return 'Rechazado';
      default:
        return 'En proceso';
    }
  }

  getStatusClasses(status: string): string {
    const visibleStatus = this.normalizeTicketStatus(status);

    switch (visibleStatus) {
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-blue-100 text-blue-700 border border-blue-200';
    }
  }

  private normalizeTicketStatus(status?: string): VisibleTicketStatus {
    if (status === 'COMPLETED') return 'COMPLETED';
    if (status === 'REJECTED') return 'REJECTED';

    if (status === 'CANCELLED') return 'REJECTED';

    return 'IN_PROGRESS';
  }

  private normalizeText(value?: string | null): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  formatDate(value?: string): string {
    if (!value) return '—';

    return new Date(value).toLocaleString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  trackByTicketId(_: number, ticket: Ticket): string {
    return ticket.id;
  }
}