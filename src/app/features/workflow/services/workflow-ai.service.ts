import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AiWorkflowResponse } from '../models/ai-workflow.model';

@Injectable({ providedIn: 'root' })
export class WorkflowAiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  runCommand(
    projectId: string,
    workflowId: string,
    payload: {
      prompt: string;
      forcedMode: 'replace' | 'patch';
      workflow: {
        nodes: any[];
        edges: any[];
      };
      departments: Array<{ id: string; name: string }>;
    },
  ) {
    return this.http.post<AiWorkflowResponse>(
      `${this.baseUrl}/projects/${projectId}/workflows/${workflowId}/ai-command`,
      payload,
    );
  }
}
