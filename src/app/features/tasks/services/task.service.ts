import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CompleteTaskRequest,
  CompletedTaskHistory,
  DepartmentTaskBoard,
  WorkflowTask,
} from '../models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getTaskBoardDepartments(projectId: string): Observable<DepartmentTaskBoard[]> {
    return this.http.get<DepartmentTaskBoard[]>(
      `${this.apiUrl}/projects/${projectId}/task-board/departments`,
    );
  }

  getMyDepartmentTasks(projectId: string, departmentId: string): Observable<WorkflowTask[]> {
    return this.http.get<WorkflowTask[]>(
      `${this.apiUrl}/projects/${projectId}/departments/${departmentId}/my-tasks`,
    );
  }

  getTaskDetail(projectId: string, taskId: string): Observable<WorkflowTask> {
    return this.http.get<WorkflowTask>(`${this.apiUrl}/projects/${projectId}/tasks/${taskId}`);
  }

  completeTask(
    projectId: string,
    taskId: string,
    data: CompleteTaskRequest,
    files: File[] = [],
  ): Observable<WorkflowTask> {
    const formData = new FormData();

    formData.append('payload', new Blob([JSON.stringify(data)], { type: 'application/json' }));

    for (const file of files) {
      formData.append('files', file);
    }

    return this.http.post<WorkflowTask>(
      `${this.apiUrl}/projects/${projectId}/tasks/${taskId}/complete`,
      formData,
    );
  }

  rejectTask(projectId: string, taskId: string, reason?: string) {
    return this.http.post<WorkflowTask>(
      `${this.apiUrl}/projects/${projectId}/tasks/${taskId}/reject`,
      { reason: reason || 'Tarea rechazada por el funcionario' },
    );
  }

  getDepartmentCompletedHistory(
    projectId: string,
    departmentId: string,
  ): Observable<CompletedTaskHistory[]> {
    return this.http.get<CompletedTaskHistory[]>(
      `${this.apiUrl}/projects/${projectId}/departments/${departmentId}/completed-history`,
    );
  }

  downloadCompletedHistoryFile(projectId: string, historyId: string, key: string) {
    return this.http.get(
      `${this.apiUrl}/projects/${projectId}/completed-history/${historyId}/files/download`,
      {
        params: { key },
        responseType: 'blob',
        observe: 'response',
      },
    );
  }
}
