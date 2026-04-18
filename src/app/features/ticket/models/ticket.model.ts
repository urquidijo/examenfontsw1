export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface Ticket {
  id: string;
  projectId: string;
  workflowId: string;
  workflowName: string;

  title: string;
  description?: string;

  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientReference?: string;

  status: TicketStatus;

  currentDepartmentId?: string;
  currentDepartmentName?: string;
  currentNodeId?: string;

  createdBy: string;
  createdAt: string;
  updatedAt: string;

  metadata?: Record<string, any>;
}

export interface WorkflowTask {
  id: string;
  projectId: string;
  ticketId: string;

  workflowId: string;
  nodeId: string;
  nodeLabel: string;

  departmentId?: string;
  departmentName?: string;

  assignedUserId?: string;
  assignedUserName?: string;

  requiresTramite: boolean;
  tramiteTemplateId?: string;
  tramiteTemplateName?: string;

  status: TaskStatus;
  submittedTramiteData?: Record<string, any>;

  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CreateTicketRequest {
  workflowId: string;

  title: string;
  description?: string;

  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientReference?: string;

  metadata?: Record<string, any>;
}