import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../../projects/services/project.service';
import { WorkflowService } from '../../../workflow/services/workflow.service';
import { TicketService } from '../../services/ticket.service';
import { Project } from '../../../projects/models/project.model';
import { WorkflowSummary } from '../../../workflow/models/workflow.model';
import { Ticket } from '../../models/ticket.model';

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
  private cdr = inject(ChangeDetectorRef);
  private projectService = inject(ProjectService);
  private workflowService = inject(WorkflowService);
  private ticketService = inject(TicketService);

  projectId = '';
  project: Project | null = null;

  tickets: Ticket[] = [];
  publishedWorkflows: WorkflowSummary[] = [];

  loading = true;
  saving = false;
  showForm = false;

  errorMessage = '';
  successMessage = '';

  selectedFiles: File[] = [];

  searchTerm = '';
  selectedStatus = '';
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
      project: this.projectService.getProjectById(this.projectId),
      workflows: this.workflowService.getWorkflows(this.projectId),
      tickets: this.ticketService.getTickets(this.projectId),
    }).subscribe({
      next: ({ project, workflows, tickets }) => {
        this.project = project;
        this.publishedWorkflows = (workflows ?? []).filter((item) => item.status === 'PUBLISHED');
        this.tickets = tickets ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar la gestión de tickets';
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
      .subscribe({
        next: (ticket) => {
          this.tickets = [ticket, ...this.tickets];
          this.saving = false;
          this.successMessage = 'Ticket creado correctamente';
          this.showForm = false;
          this.resetForm();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = error?.error?.message || 'No se pudo crear el ticket';
          this.cdr.detectChanges();
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
  }

  get workflowFilterOptions(): Array<{ id: string; name: string }> {
    const map = new Map<string, string>();

    for (const ticket of this.tickets) {
      if (ticket.workflowId && ticket.workflowName) {
        map.set(ticket.workflowId, ticket.workflowName);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  get departmentFilterOptions(): Array<{ id: string; name: string }> {
    const map = new Map<string, string>();

    for (const ticket of this.tickets) {
      if (ticket.currentDepartmentId && ticket.currentDepartmentName) {
        map.set(ticket.currentDepartmentId, ticket.currentDepartmentName);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  get filteredTickets(): Ticket[] {
    const query = this.searchTerm.trim().toLowerCase();

    return this.tickets.filter((ticket) => {
      const matchesSearch =
        !query ||
        ticket.title?.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.workflowName?.toLowerCase().includes(query) ||
        ticket.clientName?.toLowerCase().includes(query) ||
        ticket.clientEmail?.toLowerCase().includes(query) ||
        ticket.clientPhone?.toLowerCase().includes(query) ||
        ticket.currentDepartmentName?.toLowerCase().includes(query);

      const matchesStatus = !this.selectedStatus || ticket.status === this.selectedStatus;
      const matchesWorkflow =
        !this.selectedWorkflowId || ticket.workflowId === this.selectedWorkflowId;
      const matchesDepartment =
        !this.selectedDepartmentId || ticket.currentDepartmentId === this.selectedDepartmentId;

      return matchesSearch && matchesStatus && matchesWorkflow && matchesDepartment;
    });
  }

  getStatusLabel(status: Ticket['status']): string {
    switch (status) {
      case 'OPEN':
        return 'Abierto';
      case 'IN_PROGRESS':
        return 'En proceso';
      case 'COMPLETED':
        return 'Completado';
      case 'CANCELLED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  getStatusClasses(status: Ticket['status']): string {
    switch (status) {
      case 'OPEN':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border border-green-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
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