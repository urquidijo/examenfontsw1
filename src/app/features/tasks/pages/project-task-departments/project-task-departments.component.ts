import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../../projects/services/project.service';
import { TaskService } from '../../services/task.service';
import { Project } from '../../../projects/models/project.model';
import { DepartmentTaskBoard } from '../../models/task.model';

@Component({
  selector: 'app-project-task-departments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-task-departments.component.html',
})
export class ProjectTaskDepartmentsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);

  projectId = '';
  project: Project | null = null;
  departments: DepartmentTaskBoard[] = [];

  loading = true;
  errorMessage = '';

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

    forkJoin({
      project: this.projectService.getProjectById(this.projectId),
      departments: this.taskService.getTaskBoardDepartments(this.projectId),
    }).subscribe({
      next: ({ project, departments }) => {
        this.project = project;
        this.departments = departments ?? [];
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

  openDepartmentTasks(departmentId: string): void {
    this.router.navigate(['/projects', this.projectId, 'tasks', 'departments', departmentId]);
  }
}