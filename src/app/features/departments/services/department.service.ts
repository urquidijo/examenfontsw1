import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateDepartmentRequest,
  Department,
  UpdateDepartmentRequest,
} from '../models/department.model';

@Injectable({
  providedIn: 'root',
})
export class DepartmentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getDepartments(projectId: string): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/projects/${projectId}/departments`);
  }

  getDepartmentById(projectId: string, departmentId: string): Observable<Department> {
    return this.http.get<Department>(
      `${this.apiUrl}/projects/${projectId}/departments/${departmentId}`
    );
  }

  createDepartment(
    projectId: string,
    data: CreateDepartmentRequest
  ): Observable<Department> {
    return this.http.post<Department>(
      `${this.apiUrl}/projects/${projectId}/departments`,
      data
    );
  }

  updateDepartment(
    projectId: string,
    departmentId: string,
    data: UpdateDepartmentRequest
  ): Observable<Department> {
    return this.http.put<Department>(
      `${this.apiUrl}/projects/${projectId}/departments/${departmentId}`,
      data
    );
  }

  deleteDepartment(projectId: string, departmentId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/projects/${projectId}/departments/${departmentId}`
    );
  }
}