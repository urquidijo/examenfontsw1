import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ProjectAssistantChatRequest,
  ProjectAssistantChatResponse,
} from '../models/project-assistant.model';

@Injectable({
  providedIn: 'root',
})
export class ProjectAssistantService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  chat(
    projectId: string,
    payload: ProjectAssistantChatRequest,
  ): Observable<ProjectAssistantChatResponse> {
    return this.http.post<ProjectAssistantChatResponse>(
      `${this.apiUrl}/projects/${projectId}/assistant/chat`,
      payload,
    );
  }
}