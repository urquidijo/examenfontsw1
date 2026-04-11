import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { WorkflowDiagram } from '../models/workflow.model';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/projects`;

  getWorkflow(projectId: string): Observable<WorkflowDiagram> {
    return this.http.get<WorkflowDiagram>(`${this.apiUrl}/${projectId}/workflow`);
  }

  saveWorkflow(projectId: string, data: WorkflowDiagram): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/${projectId}/workflow`, data);
  }
}