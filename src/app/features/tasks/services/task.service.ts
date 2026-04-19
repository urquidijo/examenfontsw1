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
      `${this.apiUrl}/projects/${projectId}/task-board/departments`
    );
  }

  getMyDepartmentTasks(projectId: string, departmentId: string): Observable<WorkflowTask[]> {
    return this.http.get<WorkflowTask[]>(
      `${this.apiUrl}/projects/${projectId}/departments/${departmentId}/my-tasks`
    );
  }

  getTaskDetail(projectId: string, taskId: string): Observable<WorkflowTask> {
    return this.http.get<WorkflowTask>(
      `${this.apiUrl}/projects/${projectId}/tasks/${taskId}`
    );
  }

  completeTask(
    projectId: string,
    taskId: string,
    data: CompleteTaskRequest
  ): Observable<WorkflowTask> {
    return this.http.post<WorkflowTask>(
      `${this.apiUrl}/projects/${projectId}/tasks/${taskId}/complete`,
      data
    );
  }

  getDepartmentCompletedHistory(
    projectId: string,
    departmentId: string
  ): Observable<CompletedTaskHistory[]> {
    return this.http.get<CompletedTaskHistory[]>(
      `${this.apiUrl}/projects/${projectId}/departments/${departmentId}/completed-history`
    );
  }
}