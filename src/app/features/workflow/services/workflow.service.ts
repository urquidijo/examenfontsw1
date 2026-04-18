import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateWorkflowRequest,
  SaveWorkflowRequest,
  WorkflowDiagram,
  WorkflowSummary,
} from '../models/workflow.model';

@Injectable({
  providedIn: 'root',
})
export class WorkflowService {
  private http = inject(HttpClient);

  private projectsApiUrl = `${environment.apiUrl}/projects`;
  private nodeInvitesApiUrl = `${environment.apiUrl}/node-invites`;

  getWorkflows(projectId: string): Observable<WorkflowSummary[]> {
    return this.http.get<WorkflowSummary[]>(`${this.projectsApiUrl}/${projectId}/workflows`);
  }

  createWorkflow(projectId: string, data: CreateWorkflowRequest): Observable<WorkflowSummary> {
    return this.http.post<WorkflowSummary>(`${this.projectsApiUrl}/${projectId}/workflows`, data);
  }

  getWorkflow(projectId: string, workflowId: string): Observable<WorkflowDiagram> {
    return this.http.get<WorkflowDiagram>(
      `${this.projectsApiUrl}/${projectId}/workflows/${workflowId}`
    );
  }

  saveWorkflow(
    projectId: string,
    workflowId: string,
    data: SaveWorkflowRequest
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.projectsApiUrl}/${projectId}/workflows/${workflowId}`,
      data
    );
  }

  deleteWorkflow(projectId: string, workflowId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.projectsApiUrl}/${projectId}/workflows/${workflowId}`
    );
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