import { Injectable, inject } from '@angular/core';
import { WorkflowAiService } from '../../services/workflow-ai.service';
import {
  WorkflowAiEdge,
  WorkflowAiGraphResponse,
  WorkflowAiNode,
} from '../../models/workflow-ai.model';
import { Department } from '../../../departments/models/department.model';

@Injectable({
  providedIn: 'root',
})
export class WorkflowDesignerAiFacade {
  private workflowAiService = inject(WorkflowAiService);

  sendCommand(params: {
    projectId: string;
    workflowId: string;
    prompt: string;
    graph: any;
    departments: Department[];
  }) {
    const payload = {
      prompt: params.prompt.trim(),
      forcedMode: null,
      workflow: this.exportCurrentWorkflowForAi(params.graph),
      departments: params.departments ?? [],
    };

    return this.workflowAiService.aiCommand(
      params.projectId,
      params.workflowId,
      payload,
    );
  }

  applyAiGraphResponse(graph: any, response: WorkflowAiGraphResponse): void {
    if (!graph) return;

    const nodes = (response.nodes || []).map((node) => this.aiNodeToCell(node));
    const edges = (response.edges || []).map((edge) => this.aiEdgeToCell(edge));
    const cells = [...nodes, ...edges];

    if (response.mode === 'replace') {
      graph.clearCells();
      graph.fromJSON({ cells });
    } else {
      this.applyPatchCells(graph, cells);
    }
  }

  exportCurrentWorkflowForAi(graph: any): { nodes: any[]; edges: any[] } {
    const json = graph?.toJSON?.() || {};
    const cells = (json.cells || []) as any[];

    return {
      nodes: cells.filter((c) => !c.source),
      edges: cells.filter((c) => !!c.source && !!c.target),
    };
  }

  private aiNodeToCell(node: WorkflowAiNode): any {
    return {
      id: node.id,
      shape: node.shape,
      x: node.x,
      y: node.y,
      label: node.label || node.data?.label || 'Nodo',
      data: {
        ...node.data,
        label: node.data?.label || node.label || 'Nodo',
      },
    };
  }

  private aiEdgeToCell(edge: WorkflowAiEdge): any {
    const sourcePort =
      edge?.source?.port && edge.source.port.startsWith('out')
        ? edge.source.port
        : 'out-1';

    const targetPort =
      edge?.target?.port && edge.target.port.startsWith('in')
        ? edge.target.port
        : 'in-1';

    return {
      id: edge.id,
      shape: 'edge',
      source: {
        cell: edge.source.cell,
        port: sourcePort,
      },
      target: {
        cell: edge.target.cell,
        port: targetPort,
      },
      attrs: edge.attrs ?? {
        line: {
          stroke: '#64748b',
          strokeWidth: 2,
          targetMarker: {
            name: 'classic',
            size: 8,
          },
        },
      },
    };
  }

  private applyPatchCells(graph: any, cells: any[]): void {
    if (!graph) return;

    for (const cell of cells) {
      const existing = graph.getCellById?.(cell.id);

      if (existing) {
        existing.remove();
      }

      graph.addCell(cell);
    }
  }
}