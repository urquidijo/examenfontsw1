import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectKpiService } from '../../services/project-kpi.service';
import { ProjectKpiResponse } from '../../models/project-kpi.model';

@Component({
  selector: 'app-project-kpis',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './project-kpis.component.html',
})
export class ProjectKpisComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectKpiService = inject(ProjectKpiService);
  private cdr = inject(ChangeDetectorRef);

  projectId = '';

  kpi: ProjectKpiResponse | null = null;
  loadingKpis = false;
  kpiErrorMessage = '';

  savingSettings = false;
  settingsMessage = '';

  thresholdTickets = 10;
  thresholdDays = 2;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.loadSettings();
  }

  loadSettings(): void {
    if (!this.projectId) {
      this.kpiErrorMessage = 'Proyecto no encontrado';
      return;
    }

    this.projectKpiService.getProjectKpiSettings(this.projectId).subscribe({
      next: (settings) => {
        this.thresholdTickets = settings.thresholdTickets;
        this.thresholdDays = settings.thresholdDays;
        this.loadKpis();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadKpis();
        this.cdr.detectChanges();
      },
    });
  }

  saveSettings(): void {
    if (!this.projectId || this.savingSettings) return;

    const thresholdTickets = Number(this.thresholdTickets) || 1;
    const thresholdDays = Number(this.thresholdDays) || 1;

    this.savingSettings = true;
    this.settingsMessage = '';
    this.kpiErrorMessage = '';

    this.projectKpiService
      .saveProjectKpiSettings(this.projectId, {
        thresholdTickets,
        thresholdDays,
      })
      .subscribe({
        next: (settings) => {
          this.thresholdTickets = settings.thresholdTickets;
          this.thresholdDays = settings.thresholdDays;
          this.settingsMessage = 'Configuración guardada correctamente';
          this.savingSettings = false;
          this.loadKpis();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.savingSettings = false;
          this.kpiErrorMessage =
            error?.error?.message || 'No se pudo guardar la configuración de KPI';
          this.cdr.detectChanges();
        },
      });
  }

  loadKpis(): void {
    if (!this.projectId) {
      this.kpiErrorMessage = 'Proyecto no encontrado';
      return;
    }

    const thresholdTickets = Number(this.thresholdTickets) || 10;
    const thresholdDays = Number(this.thresholdDays) || 2;

    this.loadingKpis = true;
    this.kpiErrorMessage = '';

    this.projectKpiService
      .getProjectKpis(this.projectId, thresholdTickets, thresholdDays)
      .subscribe({
        next: (response) => {
          this.kpi = response;
          this.loadingKpis = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loadingKpis = false;
          this.kpiErrorMessage =
            error?.error?.message || 'No se pudieron cargar las mediciones del proyecto';
          this.cdr.detectChanges();
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId]);
  }

  get hasBottlenecks(): boolean {
    return !!this.kpi && this.kpi.totalBottleneckDepartments > 0;
  }

  get bottleneckDepartments() {
    return this.kpi?.departments?.filter((department) => department.bottleneck) ?? [];
  }

  formatHoursToDays(hours: number): string {
    const days = Number(hours || 0) / 24;
    return `${Math.round(days * 10) / 10} días`;
  }

  getSeverityLabel(severity: string): string {
    if (severity === 'HIGH') return 'Alta';
    if (severity === 'MEDIUM') return 'Media';
    return 'Baja';
  }

  getSeverityClass(severity: string): string {
    if (severity === 'HIGH') {
      return 'bg-red-100 text-red-700 border-red-200';
    }

    if (severity === 'MEDIUM') {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }

    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
}
