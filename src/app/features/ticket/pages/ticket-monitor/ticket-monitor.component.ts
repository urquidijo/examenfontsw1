import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { TicketService } from '../../services/ticket.service';
import { TicketMonitorResponse, TicketMonitorStep } from '../../models/ticket.model';

@Component({
  selector: 'app-ticket-monitor',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ticket-monitor.component.html',
})
export class TicketMonitorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ticketService = inject(TicketService);

  projectId = '';
  ticketId = '';

  loading = true;
  errorMessage = '';

  monitor: TicketMonitorResponse | null = null;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.ticketId = this.route.snapshot.paramMap.get('ticketId') || '';

    console.log('Monitor params:', {
      projectId: this.projectId,
      ticketId: this.ticketId,
    });

    if (!this.projectId || !this.ticketId) {
      this.errorMessage = 'Parámetros inválidos';
      this.loading = false;
      return;
    }

    this.loadMonitor();
  }

  loadMonitor(): void {
    this.loading = true;
    this.errorMessage = '';

    console.log('Solicitando monitor...', this.projectId, this.ticketId);

    this.ticketService
      .getTicketMonitor(this.projectId, this.ticketId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('Monitor response:', response);
          this.monitor = response;
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'tickets']);
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';

    return new Date(value).toLocaleString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDuration(minutes?: number | null): string {
    if (minutes == null) return '—';

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h <= 0) return `${m} min`;
    if (m === 0) return `${h} h`;

    return `${h} h ${m} min`;
  }

  isCurrent(step: TicketMonitorStep): boolean {
    return step.kind === 'CURRENT';
  }

  isCompleted(step: TicketMonitorStep): boolean {
    return step.kind === 'COMPLETED';
  }
  getTicketStatusLabel(status?: string | null): string {
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
        return status || 'Sin estado';
    }
  }
}
