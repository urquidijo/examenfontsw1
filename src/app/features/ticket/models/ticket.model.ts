export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface StoredFileInfo {
  key: string;
  bucket: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

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
  uploadedFiles?: StoredFileInfo[];
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

export type TicketMonitorStepKind = 'COMPLETED' | 'CURRENT';

export interface TicketMonitorStep {
  kind: TicketMonitorStepKind;
  nodeId: string;
  nodeLabel: string;
  nodeType?: string;

  departmentId?: string;
  departmentName?: string;

  assignedUserId?: string;
  assignedUserName?: string;

  decisionResult?: string | null;

  startedAt?: string | null;
  completedAt?: string | null;

  durationMinutes?: number | null;
  parallelGroupId?: string | null;
}

export interface TicketMonitorSummary {
  startedAt?: string | null;
  completedAt?: string | null;
  totalDurationMinutes?: number | null;
  currentDepartments: string[];
  currentNodeIds: string[];
  parallelActive: boolean;
}

export interface TicketMonitorResponse {
  ticket: Ticket;
  summary: TicketMonitorSummary;
  timeline: TicketMonitorStep[];
}