export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

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