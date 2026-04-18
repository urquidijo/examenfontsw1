export type WorkflowStatus = 'DRAFT' | 'PUBLISHED';

export interface WorkflowNodeData {
  id: string;
  shape: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  data?: Record<string, any>;
}

export interface WorkflowEdgeData {
  id?: string;
  shape?: string;
  source: string | { cell: string };
  target: string | { cell: string };
  labels?: Array<{ attrs?: any }>;
}

export interface WorkflowDiagram {
  workflowId: string;
  projectId: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}

export interface WorkflowSummary {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  nodesCount: number;
  edgesCount: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
}

export interface SaveWorkflowRequest {
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}