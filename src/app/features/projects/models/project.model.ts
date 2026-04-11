export type ProjectRole = 'ADMINISTRADOR' | 'FUNCIONARIO';

export interface ProjectSummary {
  projectId: string;
  name: string;
  description: string;
  role: ProjectRole;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
}

export interface InviteUserRequest {
  email: string;
}