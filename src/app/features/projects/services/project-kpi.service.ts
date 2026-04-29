import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ProjectKpiResponse,
  ProjectKpiSettings,
  ProjectKpiSettingsRequest,
} from '../models/project-kpi.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectKpiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getProjectKpis(
    projectId: string,
    thresholdTickets: number,
    thresholdDays: number,
  ): Observable<ProjectKpiResponse> {
    const params = new HttpParams()
      .set('thresholdTickets', thresholdTickets)
      .set('thresholdDays', thresholdDays);

    return this.http.get<ProjectKpiResponse>(
      `${this.apiUrl}/projects/${projectId}/kpis`,
      { params },
    );
  }

  getProjectKpiSettings(projectId: string) {
  return this.http.get<ProjectKpiSettings>(
    `${this.apiUrl}/projects/${projectId}/kpis/settings`,
  );
}

saveProjectKpiSettings(projectId: string, payload: ProjectKpiSettingsRequest) {
  return this.http.put<ProjectKpiSettings>(
    `${this.apiUrl}/projects/${projectId}/kpis/settings`,
    payload,
  );
}
}