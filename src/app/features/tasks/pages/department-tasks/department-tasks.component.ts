import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { WorkflowTask } from '../../models/task.model';

@Component({
  selector: 'app-department-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './department-tasks.component.html',
})
export class DepartmentTasksComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);
  private cdr = inject(ChangeDetectorRef);

  projectId = '';
  departmentId = '';
  tasks: WorkflowTask[] = [];

  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.departmentId = this.route.snapshot.paramMap.get('departmentId') || '';
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.errorMessage = '';

    this.taskService.getMyDepartmentTasks(this.projectId, this.departmentId).subscribe({
      next: (tasks) => {
        this.tasks = tasks ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || 'No se pudieron cargar las tareas del departamento';
        this.cdr.detectChanges();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'tasks']);
  }

  openTask(taskId: string): void {
    this.router.navigate(['/projects', this.projectId, 'tasks', taskId]);
  }

  openCompletedTasks(): void {
    this.router.navigate([
      '/projects',
      this.projectId,
      'tasks',
      'departments',
      this.departmentId,
      'completed',
    ]);
  }

  getTaskStatusLabel(status: WorkflowTask['status']): string {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'IN_PROGRESS':
        return 'En proceso';
      case 'DONE':
        return 'Hecho';
      default:
        return status;
    }
  }
}