import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateProjectInvitationRequest,
  ProjectInvitation,
  ProjectMember,
} from '../models/project-user.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectUserService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getProjectMembers(projectId: string): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`${this.apiUrl}/projects/${projectId}/members`);
  }

  getProjectInvitations(projectId: string): Observable<ProjectInvitation[]> {
    return this.http.get<ProjectInvitation[]>(`${this.apiUrl}/projects/${projectId}/invitations`);
  }

  createInvitation(
    projectId: string,
    data: CreateProjectInvitationRequest
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/projects/${projectId}/invitations`,
      data
    );
  }

  getMyPendingInvitations(): Observable<ProjectInvitation[]> {
    return this.http.get<ProjectInvitation[]>(`${this.apiUrl}/project-invitations/me`);
  }

  acceptInvitation(invitationId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/project-invitations/${invitationId}/accept`,
      {}
    );
  }

  rejectInvitation(invitationId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/project-invitations/${invitationId}/reject`,
      {}
    );
  }
}