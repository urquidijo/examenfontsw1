export type WorkflowStatus = 'DRAFT' | 'PUBLISHED';

export type WorkflowNodeType =
  | 'start'
  | 'task'
  | 'decision'
  | 'fork'
  | 'join'
  | 'end';

type NodeType = WorkflowNodeType;

type DecisionOption = {
  value: string;
  label: string;
};

type WorkflowNodeConfig = {
  label: string;
  nodeType: NodeType;
  departmentId?: string;
  departmentName?: string;
  instructions?: string;
  aiAlias?: string;

  decisionMode?: 'MANUAL';
  decisionQuestion?: string;
  decisionOptions?: DecisionOption[];
};

export interface WorkflowNodeData {
  id: string;
  shape: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  data?: WorkflowNodeConfig;
}

export interface WorkflowEdgeData {
  id?: string;
  shape?: string;
  source: string | { cell: string; port?: string };
  target: string | { cell: string; port?: string };
  conditionValue?: string;
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
  status: WorkflowStatus;
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