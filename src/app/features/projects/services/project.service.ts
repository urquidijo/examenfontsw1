import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateProjectRequest,
  InviteUserRequest,
  Project,
  ProjectSummary,
} from '../models/project.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/projects`;

  getMyProjects(): Observable<ProjectSummary[]> {
    return this.http.get<ProjectSummary[]>(`${this.apiUrl}/me`);
  }

  getOwnedProjects(): Observable<ProjectSummary[]> {
    return this.http.get<ProjectSummary[]>(`${this.apiUrl}/owned`);
  }

  getSharedProjects(): Observable<ProjectSummary[]> {
    return this.http.get<ProjectSummary[]>(`${this.apiUrl}/shared`);
  }

  getProjectById(projectId: string): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${projectId}`);
  }

  createProject(data: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, data);
  }

  inviteUser(projectId: string, data: InviteUserRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${projectId}/invite`, data);
  }

  deleteProject(projectId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${projectId}`);
  }
}