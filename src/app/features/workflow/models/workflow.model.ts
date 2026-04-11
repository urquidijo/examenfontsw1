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
  projectId: string;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}