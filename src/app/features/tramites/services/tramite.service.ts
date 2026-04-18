import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateTramiteRequest,
  TramiteTemplate,
  UpdateTramiteRequest,
} from '../models/tramite.model';

@Injectable({
  providedIn: 'root',
})
export class TramiteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getTramites(projectId: string): Observable<TramiteTemplate[]> {
    return this.http.get<TramiteTemplate[]>(`${this.apiUrl}/projects/${projectId}/tramites`);
  }

  getTramiteById(projectId: string, tramiteId: string): Observable<TramiteTemplate> {
    return this.http.get<TramiteTemplate>(
      `${this.apiUrl}/projects/${projectId}/tramites/${tramiteId}`
    );
  }

  createTramite(projectId: string, data: CreateTramiteRequest): Observable<TramiteTemplate> {
    return this.http.post<TramiteTemplate>(
      `${this.apiUrl}/projects/${projectId}/tramites`,
      data
    );
  }

  updateTramite(
    projectId: string,
    tramiteId: string,
    data: UpdateTramiteRequest
  ): Observable<TramiteTemplate> {
    return this.http.put<TramiteTemplate>(
      `${this.apiUrl}/projects/${projectId}/tramites/${tramiteId}`,
      data
    );
  }

  deleteTramite(projectId: string, tramiteId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/projects/${projectId}/tramites/${tramiteId}`
    );
  }
}