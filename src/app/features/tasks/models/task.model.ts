export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export type TaskNodeType = 'start' | 'task' | 'decision' | 'fork' | 'join' | 'end';

export type DecisionMode = 'MANUAL';

export interface DecisionOption {
  value: string;
  label: string;
}

export interface WorkflowTask {
  id: string;
  projectId: string;
  ticketId: string;

  workflowId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType?: TaskNodeType;

  departmentId?: string;
  departmentName?: string;

  assignedUserId?: string;
  assignedUserName?: string;

  requiresTramite: boolean;
  tramiteTemplateId?: string;
  tramiteTemplateName?: string;

  decisionMode?: DecisionMode;
  decisionQuestion?: string;
  decisionOptions?: DecisionOption[];

  status: TaskStatus;
  submittedTramiteData?: Record<string, any>;

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
  nodeType?: TaskNodeType;

  departmentId: string;
  departmentName: string;

  assignedUserId?: string;
  assignedUserName?: string;

  requiresTramite: boolean;
  tramiteTemplateId?: string;
  tramiteTemplateName?: string;

  decisionResult?: string;
  submittedTramiteData?: Record<string, any>;

  startedAt?: string;
  completedAt?: string;
}

export interface CompleteTaskRequest {
  tramiteData?: Record<string, any>;
  decisionResult?: string;
}