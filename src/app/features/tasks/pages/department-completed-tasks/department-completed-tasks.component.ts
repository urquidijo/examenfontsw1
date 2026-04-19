import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { CompletedTaskHistory, StoredFileInfo } from '../../models/task.model';

@Component({
  selector: 'app-department-completed-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './department-completed-tasks.component.html',
})
export class DepartmentCompletedTasksComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);
  private cdr = inject(ChangeDetectorRef);

  projectId = '';
  departmentId = '';

  loading = true;
  errorMessage = '';

  completedTasks: CompletedTaskHistory[] = [];
  searchTerm = '';

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.departmentId = this.route.snapshot.paramMap.get('departmentId') || '';
    this.loadCompletedTasks();
  }

  loadCompletedTasks(): void {
    this.loading = true;
    this.errorMessage = '';

    this.taskService
      .getDepartmentCompletedHistory(this.projectId, this.departmentId)
      .subscribe({
        next: (items) => {
          this.completedTasks = items ?? [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage =
            error?.error?.message || 'No se pudieron cargar las tareas completadas';
          this.cdr.detectChanges();
        },
      });
  }

  goBack(): void {
    this.router.navigate([
      '/projects',
      this.projectId,
      'tasks',
      'departments',
      this.departmentId,
    ]);
  }

  get filteredCompletedTasks(): CompletedTaskHistory[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) return this.completedTasks;

    return this.completedTasks.filter((item) => {
      const ticketId = item.ticketId?.toLowerCase() || '';
      const nodeLabel = item.nodeLabel?.toLowerCase() || '';
      const assignedUserName = item.assignedUserName?.toLowerCase() || '';
      const departmentName = item.departmentName?.toLowerCase() || '';

      return (
        ticketId.includes(term) ||
        nodeLabel.includes(term) ||
        assignedUserName.includes(term) ||
        departmentName.includes(term)
      );
    });
  }

  formatFileSize(size?: number): string {
    if (!size || size <= 0) return '0 KB';

    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;

    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  downloadCompletedHistoryFile(item: CompletedTaskHistory, file: StoredFileInfo): void {
    this.taskService
      .downloadCompletedHistoryFile(this.projectId, item.id, file.key)
      .subscribe({
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
          this.errorMessage =
            error?.error?.message || 'No se pudo descargar el archivo del histórico';
          this.cdr.detectChanges();
        },
      });
  }
}