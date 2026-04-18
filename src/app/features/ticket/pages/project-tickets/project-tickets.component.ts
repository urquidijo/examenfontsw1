import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
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
      this.ticketForm.reset({
        workflowId: '',
        title: '',
        description: '',
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        clientReference: '',
      });
    }
  }

  createTicket(): void {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.ticketService.createTicket(this.projectId, this.ticketForm.getRawValue()).subscribe({
      next: (ticket) => {
        this.tickets = [ticket, ...this.tickets];
        this.saving = false;
        this.successMessage = 'Ticket creado correctamente';
        this.showForm = false;

        this.ticketForm.reset({
          workflowId: '',
          title: '',
          description: '',
          clientName: '',
          clientPhone: '',
          clientEmail: '',
          clientReference: '',
        });

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'No se pudo crear el ticket';
        this.cdr.detectChanges();
      },
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
}