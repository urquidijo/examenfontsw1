export type ProjectRole = 'ADMINISTRADOR' | 'FUNCIONARIO';

export type InvitationStatus =
  | 'PENDIENTE'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'CANCELADA';

export interface ProjectMember {
  userId: string;
  name: string;
  email: string;
  role: ProjectRole;
  assignedNodeId?: string | null;
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectName: string;
  invitedUserId: string;
  invitedName: string;
  invitedEmail: string;
  role: ProjectRole;
  status: InvitationStatus;
  createdAt: string;
}

export interface CreateProjectInvitationRequest {
  email?: string;
  name?: string;
  role: ProjectRole;
}