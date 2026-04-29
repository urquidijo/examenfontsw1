import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  FormAiFillRequest,
  FormAiFillResponse,
} from '../models/task-form-ai.model';

@Injectable({
  providedIn: 'root',
})
export class TaskFormAiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  fillTaskFormWithAi(
    projectId: string,
    taskId: string,
    payload: FormAiFillRequest,
  ): Observable<FormAiFillResponse> {
    return this.http.post<FormAiFillResponse>(
      `${this.apiUrl}/projects/${projectId}/tasks/${taskId}/form-ai/fill`,
      payload,
    );
  }
}