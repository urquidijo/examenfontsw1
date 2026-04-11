import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  StoredUser,
  MessageResponse,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = environment.apiUrl;

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  register(data: RegisterRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/api/auth/register`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/login`, data).pipe(
      tap((response) => {
        if (!this.isBrowser()) {
          return;
        }

        localStorage.setItem('token', response.token);

        const user: StoredUser = {
          id: response.id,
          name: response.name,
          email: response.email,
          role: response.role ?? null
        };

        localStorage.setItem('user', JSON.stringify(user));
      })
    );
  }

  logout(): void {
    if (!this.isBrowser()) {
      return;
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUser(): StoredUser | null {
    if (!this.isBrowser()) {
      return null;
    }

    const user = localStorage.getItem('user');
    return user ? (JSON.parse(user) as StoredUser) : null;
  }
}