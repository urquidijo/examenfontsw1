import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { ProjectKpiService } from '../../services/project-kpi.service';
import { Project } from '../../models/project.model';
import { ProjectKpiResponse } from '../../models/project-kpi.model';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './project-detail.component.html',
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private projectKpiService = inject(ProjectKpiService);
  private cdr = inject(ChangeDetectorRef);

  projectId = '';
  project: Project | null = null;

  loading = true;
  errorMessage = '';

  kpi: ProjectKpiResponse | null = null;
  loadingKpis = false;
  kpiErrorMessage = '';

  thresholdTickets = 10;
  thresholdDays = 2;

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.loadProject();
  }

  loadProject(): void {
    if (!this.projectId) {
      this.loading = false;
      this.errorMessage = 'Proyecto no encontrado';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.projectService.getProjectById(this.projectId).subscribe({
      next: (project) => {
        this.project = project;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar el proyecto';
        this.cdr.detectChanges();
      },
    });
  }

  
  get hasBottlenecks(): boolean {
    return !!this.kpi && this.kpi.totalBottleneckDepartments > 0;
  }

  get bottleneckDepartments() {
    return this.kpi?.departments?.filter((department) => department.bottleneck) ?? [];
  }

  get normalDepartments() {
    return this.kpi?.departments?.filter((department) => !department.bottleneck) ?? [];
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

  openKpis(): void {
  this.router.navigate(['/projects', this.projectId, 'kpis']);
}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  openWorkflows(): void {
    this.router.navigate(['/projects', this.projectId, 'workflows']);
  }

  openUsers(): void {
    this.router.navigate(['/projects', this.projectId, 'users']);
  }

  openDepartments(): void {
    this.router.navigate(['/projects', this.projectId, 'departments']);
  }

  openCases(): void {
    this.router.navigate(['/projects', this.projectId, 'tramites']);
  }

  openTickets(): void {
    this.router.navigate(['/projects', this.projectId, 'tickets']);
  }

  openTasks(): void {
    this.router.navigate(['/projects', this.projectId, 'tasks']);
  }
}