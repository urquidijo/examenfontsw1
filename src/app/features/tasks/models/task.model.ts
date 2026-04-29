export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';

export interface StoredFileInfo {
  key: string;
  bucket: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DecisionOption {
  label: string;
  value: string;
}

export interface TaskTicketInfo {
  id: string;
  title: string;
  description?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientReference?: string;
  status: TicketStatus;
  metadata?: Record<string, any>;
  uploadedFiles?: StoredFileInfo[];
}

export interface WorkflowTask {
  id: string;
  projectId: string;
  ticketId: string;
  workflowId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;

  departmentId?: string;
  departmentName?: string;

  assignedUserId?: string;
  assignedUserName?: string;

  requiresTramite: boolean;
  tramiteTemplateId?: string;
  tramiteTemplateName?: string;

  decisionMode?: string;
  decisionQuestion?: string;
  decisionOptions?: DecisionOption[];

  status: TaskStatus;
  submittedTramiteData?: Record<string, any>;
  uploadedFiles?: StoredFileInfo[];

  ticket?: TaskTicketInfo;

  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface DepartmentTaskBoard {
  departmentId: string;
  departmentName: string;
  activeTasksCount: number;
  completedTasksCount: number;
  assignedToMe: boolean;
}

export interface CompletedTaskHistory {
  id: string;
  projectId: string;
  ticketId: string;
  workflowId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  departmentId?: string;
  departmentName?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  requiresTramite: boolean;
  tramiteTemplateId?: string;
  tramiteTemplateName?: string;
  decisionResult?: string;
  submittedTramiteData?: Record<string, any>;
  uploadedFiles?: StoredFileInfo[];
  startedAt?: string;
  completedAt?: string;
}

export interface CompleteTaskRequest {
  tramiteData?: Record<string, any>;
  decisionResult?: string;
}