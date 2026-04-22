export type AiNodeType = 'start' | 'task' | 'decision' | 'fork' | 'join' | 'end';

export interface AiDecisionOption {
  value: string;
  label: string;
}

export type AiWorkflowOperation =
  | {
      type: 'createNode';
      alias?: string;
      nodeType: AiNodeType;
      label: string;
      departmentName?: string;
      instructions?: string;
      decisionQuestion?: string;
      decisionOptions?: AiDecisionOption[];
      x?: number;
      y?: number;
    }
  | {
      type: 'renameNode';
      target: string;
      newLabel: string;
    }
  | {
      type: 'updateNode';
      target: string;
      departmentName?: string;
      instructions?: string;
      decisionQuestion?: string;
      decisionOptions?: AiDecisionOption[];
    }
  | {
      type: 'deleteNode';
      target: string;
      reconnect?: boolean;
    }
  | {
      type: 'connectNodes';
      source: string;
      target: string;
      conditionValue?: string;
      conditionLabel?: string;
    }
  | {
      type: 'disconnectNodes';
      source: string;
      target: string;
    };

export interface AiWorkflowResponse {
  mode: 'replace' | 'patch';
  summary: string;
  operations: AiWorkflowOperation[];
}