export type WorkflowAiMode = 'replace' | 'patch'

export interface WorkflowAiCommandRequest {
  prompt: string
  forcedMode?: WorkflowAiMode | null
  workflow: any
  departments?: any[]
}

export interface WorkflowAiGraphResponse {
  mode: WorkflowAiMode
  summary: string
  nodes: WorkflowAiNode[]
  edges: WorkflowAiEdge[]
}

export interface WorkflowAiNode {
  id: string
  shape: 'workflow-start' | 'workflow-task' | 'workflow-decision' | 'workflow-fork' | 'workflow-join' | 'workflow-end'
  x: number
  y: number
  label: string
  data: WorkflowAiNodeData
}

export interface WorkflowAiNodeData {
  label: string
  nodeType: 'start' | 'task' | 'decision' | 'fork' | 'join' | 'end'
  departmentId?: string
  departmentName?: string
  instructions?: string
  aiAlias?: string
  decisionMode?: string
  decisionQuestion?: string
  decisionOptions?: WorkflowAiDecisionOption[]
}

export interface WorkflowAiDecisionOption {
  value: string
  label: string
}

export interface WorkflowAiEdge {
  id: string
  shape: 'edge'
  source: WorkflowAiEdgeEndpoint
  target: WorkflowAiEdgeEndpoint
  attrs?: Record<string, any>
}

export interface WorkflowAiEdgeEndpoint {
  cell: string
  port: string
}