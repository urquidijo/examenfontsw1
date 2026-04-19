import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Ticket, CreateTicketRequest } from '../models/ticket.model';

@Injectable({
  providedIn: 'root',
})
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getTickets(projectId: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/projects/${projectId}/tickets`);
  }

  downloadTicketFile(projectId: string, ticketId: string, key: string) {
    return this.http.get(
      `${this.apiUrl}/projects/${projectId}/tickets/${ticketId}/files/download`,
      {
        params: { key },
        responseType: 'blob',
        observe: 'response',
      },
    );
  }

  createTicket(
    projectId: string,
    payload: CreateTicketRequest,
    files: File[] = [],
  ): Observable<Ticket> {
    const formData = new FormData();

    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

    for (const file of files) {
      formData.append('files', file);
    }

    return this.http.post<Ticket>(`${this.apiUrl}/projects/${projectId}/tickets`, formData);
  }
}
