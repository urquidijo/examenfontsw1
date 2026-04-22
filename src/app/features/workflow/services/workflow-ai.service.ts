import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import {
  WorkflowAiCommandRequest,
  WorkflowAiGraphResponse,
} from '../models/workflow-ai.model'

@Injectable({
  providedIn: 'root',
})
export class WorkflowAiService {
  private http = inject(HttpClient)
  private apiUrl = environment.apiUrl

  aiCommand(
    projectId: string,
    workflowId: string,
    body: WorkflowAiCommandRequest
  ): Observable<WorkflowAiGraphResponse> {
    return this.http.post<WorkflowAiGraphResponse>(
      `${this.apiUrl}/projects/${projectId}/workflows/${workflowId}/ai-command`,
      body
    )
  }
}