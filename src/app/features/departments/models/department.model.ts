export interface DepartmentAssignedUser {
  userId: string;
  name: string;
  email: string;
}

export interface Department {
  id: string;
  projectId: string;
  name: string;
  description: string;
  assignedUserIds: string[];
  assignedUsers: DepartmentAssignedUser[];
  requiresTramite: boolean;
  tramiteTemplateId?: string | null;
  tramiteName?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
  assignedUserIds?: string[];
  requiresTramite?: boolean;
  tramiteTemplateId?: string | null;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  assignedUserIds?: string[];
  requiresTramite?: boolean;
  tramiteTemplateId?: string | null;
}