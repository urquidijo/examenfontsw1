import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { WorkflowDiagram } from '../models/workflow.model';

@Injectable({
  providedIn: 'root',
})
export class WorkflowService {
  private http = inject(HttpClient);

  private projectsApiUrl = `${environment.apiUrl}/projects`;
  private nodeInvitesApiUrl = `${environment.apiUrl}/node-invites`;

  getWorkflow(projectId: string): Observable<WorkflowDiagram> {
    return this.http.get<WorkflowDiagram>(`${this.projectsApiUrl}/${projectId}/workflow`);
  }

  saveWorkflow(projectId: string, data: WorkflowDiagram): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.projectsApiUrl}/${projectId}/workflow`, data);
  }

  createNodeInviteLink(projectId: string, nodeId: string, nodeLabel?: string) {
    let url = `${this.nodeInvitesApiUrl}/projects/${projectId}/nodes/${nodeId}/generate`;

    if (nodeLabel) {
      url += `?nodeLabel=${encodeURIComponent(nodeLabel)}`;
    }

    return this.http.post<{ token: string; inviteLink: string }>(url, {});
  }

  validateInvite(token: string) {
    return this.http.get<{
      projectId: string;
      projectName: string;
      nodeId: string;
      nodeLabel: string;
      expiresAt: string;
    }>(`${this.nodeInvitesApiUrl}/${token}`);
  }

  acceptInvite(token: string) {
    return this.http.post<{
      message: string;
      projectId: string;
      nodeId: string;
    }>(`${this.nodeInvitesApiUrl}/${token}/accept`, {});
  }
}