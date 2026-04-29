import { Injectable, inject } from '@angular/core';
import { WorkflowAiService } from '../../services/workflow-ai.service';
import {
  WorkflowAiEdge,
  WorkflowAiGraphResponse,
  WorkflowAiNode,
} from '../../models/workflow-ai.model';
import { Department } from '../../../departments/models/department.model';
import { of } from 'rxjs';

type NodeType = 'start' | 'task' | 'decision' | 'fork' | 'join' | 'end';

type AiNodeCell = {
  id: string;
  shape: string;
  x: number;
  y: number;
  label: string;
  data: Record<string, any>;
  [key: string]: any;
};

type AiEdgeCell = {
  id: string;
  shape: 'edge';
  source: { cell: string; port: string };
  target: { cell: string; port: string };
  attrs: Record<string, any>;
  data?: Record<string, any>;
  conditionValue?: string;
  labels?: any[];
  [key: string]: any;
};

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
    const workflow = this.exportCurrentWorkflowForAi(params.graph);

    const localDeleteResponse = this.tryBuildLocalDeleteResponse(params.prompt, workflow);

    if (localDeleteResponse) {
      return of(localDeleteResponse);
    }

    const payload = {
      prompt: this.buildFrontendGuardPrompt(params.prompt, workflow),
      forcedMode: null,
      workflow,
      departments: params.departments ?? [],
    };

    return this.workflowAiService.aiCommand(params.projectId, params.workflowId, payload);
  }
  private tryBuildLocalDeleteResponse(
    prompt: string,
    workflow: { nodes: any[]; edges: any[] },
  ): WorkflowAiGraphResponse | null {
    const normalizedPrompt = this.normalizeSearchText(prompt);

    const isDeleteIntent =
      normalizedPrompt.includes('eliminar') ||
      normalizedPrompt.includes('elimina') ||
      normalizedPrompt.includes('borrar') ||
      normalizedPrompt.includes('borra') ||
      normalizedPrompt.includes('quitar') ||
      normalizedPrompt.includes('quita') ||
      normalizedPrompt.includes('sacar') ||
      normalizedPrompt.includes('saca');

    if (!isDeleteIntent) {
      return null;
    }

    const nodeToDelete = this.findNodeToDeleteFromPrompt(prompt, workflow.nodes || []);

    if (!nodeToDelete) {
      return null;
    }

    const nodeType = this.normalizeNodeType(
      nodeToDelete?.data?.nodeType ||
        nodeToDelete?.nodeType ||
        this.getNodeTypeFromShape(nodeToDelete?.shape || ''),
    );

    if (nodeType === 'start' || nodeType === 'end') {
      return {
        mode: 'patch',
        summary:
          'No se eliminó el nodo porque el workflow debe tener exactamente un Inicio y un Fin.',
        nodes: [],
        edges: [],
      } as WorkflowAiGraphResponse;
    }

    const nodeId = nodeToDelete.id;
    const nodeLabel = nodeToDelete.label || nodeToDelete?.data?.label || 'Nodo seleccionado';

    const incomingEdges = (workflow.edges || []).filter(
      (edge) => this.getEdgeTargetCell(edge) === nodeId,
    );

    const outgoingEdges = (workflow.edges || []).filter(
      (edge) => this.getEdgeSourceCell(edge) === nodeId,
    );

    const bridgeEdges: any[] = [];

    const canBridge = nodeType !== 'decision' && nodeType !== 'fork' && nodeType !== 'join';

    if (canBridge) {
      for (const incoming of incomingEdges) {
        for (const outgoing of outgoingEdges) {
          const sourceCell = this.getEdgeSourceCell(incoming);
          const targetCell = this.getEdgeTargetCell(outgoing);

          if (!sourceCell || !targetCell) continue;
          if (sourceCell === targetCell) continue;
          if (sourceCell === nodeId || targetCell === nodeId) continue;

          const conditionValue = incoming?.conditionValue || incoming?.data?.conditionValue || '';

          bridgeEdges.push(
            this.createEdge(
              `${sourceCell}-to-${targetCell}`,
              sourceCell,
              targetCell,
              conditionValue || undefined,
            ),
          );
        }
      }
    }

    return {
      mode: 'patch',
      summary: `Nodo "${nodeLabel}" eliminado`,
      nodes: [
        {
          id: nodeId,
          shape: nodeToDelete.shape || this.getShapeFromNodeType(nodeType),
          x: nodeToDelete.x ?? 0,
          y: nodeToDelete.y ?? 0,
          label: nodeLabel,
          data: {
            ...(nodeToDelete.data || {}),
            label: nodeLabel,
            nodeType,
            action: 'delete',
          },
        },
      ],
      edges: bridgeEdges,
    } as WorkflowAiGraphResponse;
  }

  private findNodeToDeleteFromPrompt(prompt: string, nodes: any[]): any | null {
    const normalizedPrompt = this.normalizeSearchText(prompt);

    const candidates = nodes
      .filter((node) => !node?.data?.isSwimlane)
      .map((node) => {
        const label = node?.label || node?.data?.label || '';
        const id = node?.id || '';

        const normalizedLabel = this.normalizeSearchText(label);
        const normalizedId = this.normalizeSearchText(id);

        let score = 0;

        if (normalizedLabel && normalizedPrompt.includes(normalizedLabel)) {
          score += 100 + normalizedLabel.length;
        }

        if (normalizedId && normalizedPrompt.includes(normalizedId)) {
          score += 80 + normalizedId.length;
        }

        const labelWords = normalizedLabel.split(' ').filter((word) => word.length >= 3);

        const matchedWords = labelWords.filter((word) => normalizedPrompt.includes(word));

        if (labelWords.length > 0) {
          score += Math.round((matchedWords.length / labelWords.length) * 50);
        }

        return {
          node,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return candidates[0]?.node || null;
  }

  private getEdgeSourceCell(edge: any): string {
    if (!edge) return '';
    if (typeof edge.source === 'string') return edge.source;
    return edge.source?.cell || '';
  }

  private getEdgeTargetCell(edge: any): string {
    if (!edge) return '';
    if (typeof edge.target === 'string') return edge.target;
    return edge.target?.cell || '';
  }

  private normalizeSearchText(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  applyAiGraphResponse(graph: any, response: WorkflowAiGraphResponse): void {
    if (!graph) return;

    const mode = response?.mode === 'replace' ? 'replace' : 'patch';
    const currentWorkflow = this.exportCurrentWorkflowForAi(graph);

    const aiNodes = (response.nodes || []).map((node, index) => this.aiNodeToCell(node, index));

    const aiEdges = (response.edges || []).map((edge, index) => this.aiEdgeToCell(edge, index));

    const merged =
      mode === 'replace'
        ? {
            nodes: aiNodes,
            edges: aiEdges,
          }
        : this.mergePatchWithCurrentWorkflow(currentWorkflow, aiNodes, aiEdges);

    const repaired = this.repairWorkflow(merged.nodes, merged.edges);

    graph.clearCells();
    graph.fromJSON({
      cells: [...repaired.nodes, ...repaired.edges],
    });
  }

  exportCurrentWorkflowForAi(graph: any): { nodes: any[]; edges: any[] } {
    const json = graph?.toJSON?.() || {};
    const cells = (json.cells || []) as any[];

    return {
      nodes: cells.filter((c) => !c.source && !c.data?.isSwimlane),
      edges: cells.filter((c) => !!c.source && !!c.target),
    };
  }

  private buildFrontendGuardPrompt(
    originalPrompt: string,
    workflow: { nodes: any[]; edges: any[] },
  ): string {
    const nodesText = (workflow.nodes || [])
      .map((node) => {
        const label = node?.label || node?.data?.label || 'Sin nombre';
        const nodeType = node?.data?.nodeType || node?.shape || 'task';
        return `- id="${node.id}", label="${label}", type="${nodeType}"`;
      })
      .join('\n');

    return `
INSTRUCCIÓN DEL USUARIO:
${originalPrompt.trim()}

NODOS ACTUALES DEL WORKFLOW:
${nodesText || 'No hay nodos actuales.'}

REGLAS OBLIGATORIAS:
- Responde SOLO JSON válido.
- Si el usuario pide eliminar, borrar o quitar un nodo, usa mode="patch".
- Para eliminar un nodo existente, debes devolver EXACTAMENTE el id del nodo actual y data.action="delete".
- No inventes ids de nodos existentes.
- Si modificas un nodo existente, conserva su id.
- Si es condicional, usa una decision con solo dos salidas: SI y NO.
- Debe existir exactamente 1 start y exactamente 1 end.
- Si hay varias rutas finales, todas deben llegar al mismo único end.
- Si usas fork, todas las ramas deben cerrar en un join.
- No dejes nodos sueltos.
`.trim();
  }

  private mergePatchWithCurrentWorkflow(
    currentWorkflow: { nodes: any[]; edges: any[] },
    patchNodes: AiNodeCell[],
    patchEdges: AiEdgeCell[],
  ): { nodes: AiNodeCell[]; edges: AiEdgeCell[] } {
    const currentNodes = (currentWorkflow.nodes || []).map((node, index) =>
      this.anyNodeToCell(node, index),
    );

    const currentEdges = (currentWorkflow.edges || []).map((edge, index) =>
      this.anyEdgeToCell(edge, index),
    );

    const nodeMap = new Map<string, AiNodeCell>();
    const edgeMap = new Map<string, AiEdgeCell>();

    currentNodes.forEach((node) => nodeMap.set(node.id, node));
    currentEdges.forEach((edge) => edgeMap.set(edge.id, edge));

    for (const node of patchNodes) {
      if (this.isDeleteAction(node)) {
        nodeMap.delete(node.id);

        for (const [edgeId, edge] of edgeMap.entries()) {
          if (edge.source.cell === node.id || edge.target.cell === node.id) {
            edgeMap.delete(edgeId);
          }
        }

        continue;
      }

      const existing = nodeMap.get(node.id);

      nodeMap.set(node.id, {
        ...(existing || {}),
        ...node,
        data: {
          ...(existing?.data || {}),
          ...(node.data || {}),
        },
      });
    }

    for (const edge of patchEdges) {
      if (this.isDeleteAction(edge)) {
        edgeMap.delete(edge.id);
        continue;
      }

      edgeMap.set(edge.id, edge);
    }

    return {
      nodes: [...nodeMap.values()],
      edges: [...edgeMap.values()],
    };
  }

  private repairWorkflow(
    rawNodes: AiNodeCell[],
    rawEdges: AiEdgeCell[],
  ): { nodes: AiNodeCell[]; edges: AiEdgeCell[] } {
    let nodes = rawNodes.map((node, index) => this.anyNodeToCell(node, index));
    let edges = rawEdges.map((edge, index) => this.anyEdgeToCell(edge, index));

    nodes = this.ensureUniqueNodeIds(nodes);
    edges = this.ensureUniqueEdgeIds(edges);

    edges = this.removeInvalidEdges(nodes, edges);
    edges = this.removeDuplicatedEdges(edges);

    const startNodes = nodes.filter((node) => this.getNodeType(node) === 'start');
    const endNodes = nodes.filter((node) => this.getNodeType(node) === 'end');

    if (!startNodes.length) {
      nodes.unshift(this.createNode('start', 'Inicio', 80, 180, 'ai-start'));
    }

    if (!endNodes.length) {
      nodes.push(this.createNode('end', 'Fin', 980, 180, 'ai-end'));
    }

    const singleStartEnd = this.normalizeSingleStartAndEnd(nodes, edges);
    nodes = singleStartEnd.nodes;
    edges = singleStartEnd.edges;

    edges = this.removeInvalidEdges(nodes, edges);

    const decisionResult = this.repairDecisionNodes(nodes, edges);
    nodes = decisionResult.nodes;
    edges = decisionResult.edges;

    const forkResult = this.repairForkJoinNodes(nodes, edges);
    nodes = forkResult.nodes;
    edges = forkResult.edges;

    edges = this.repairBasicOrphans(nodes, edges);
    edges = this.removeInvalidEdges(nodes, edges);
    edges = this.removeDuplicatedEdges(edges);

    return {
      nodes,
      edges,
    };
  }

  private repairDecisionNodes(
    nodes: AiNodeCell[],
    edges: AiEdgeCell[],
  ): { nodes: AiNodeCell[]; edges: AiEdgeCell[] } {
    const resultNodes = [...nodes];
    let resultEdges = [...edges];

    for (const decision of resultNodes.filter((node) => this.getNodeType(node) === 'decision')) {
      decision.data = {
        ...decision.data,
        nodeType: 'decision',
        decisionMode: 'MANUAL',
        decisionQuestion:
          decision.data?.['decisionQuestion'] || decision.label || 'Seleccione una opción',
        decisionOptions: [
          { value: 'SI', label: 'Sí' },
          { value: 'NO', label: 'No' },
        ],
      };

      const outgoing = resultEdges.filter((edge) => edge.source.cell === decision.id);

      if (outgoing.length > 2) {
        const allowedIds = new Set(outgoing.slice(0, 2).map((edge) => edge.id));
        resultEdges = resultEdges.filter(
          (edge) => edge.source.cell !== decision.id || allowedIds.has(edge.id),
        );
      }

      let updatedOutgoing = resultEdges.filter((edge) => edge.source.cell === decision.id);

      if (updatedOutgoing.length < 2) {
        const missingCount = 2 - updatedOutgoing.length;

        for (let i = 0; i < missingCount; i++) {
          const option = updatedOutgoing.length === 0 ? 'SI' : 'NO';
          const branchNode = this.createNode(
            'task',
            option === 'SI' ? 'Ruta Sí' : 'Ruta No',
            decision.x + 300,
            decision.y + (option === 'SI' ? -120 : 120),
            `${decision.id}-${option.toLowerCase()}-task`,
          );

          resultNodes.push(branchNode);

          resultEdges.push(
            this.createEdge(
              `${decision.id}-${option.toLowerCase()}-edge`,
              decision.id,
              branchNode.id,
              option,
            ),
          );

          const endNode = resultNodes.find((node) => this.getNodeType(node) === 'end');

          if (endNode) {
            resultEdges.push(
              this.createEdge(`${branchNode.id}-to-${endNode.id}`, branchNode.id, endNode.id),
            );
          }

          updatedOutgoing = resultEdges.filter((edge) => edge.source.cell === decision.id);
        }
      }

      updatedOutgoing = resultEdges.filter((edge) => edge.source.cell === decision.id);

      updatedOutgoing.slice(0, 2).forEach((edge, index) => {
        const value = index === 0 ? 'SI' : 'NO';
        this.applyDecisionCondition(edge, value);
      });
    }

    return {
      nodes: resultNodes,
      edges: resultEdges,
    };
  }

  private repairForkJoinNodes(
    nodes: AiNodeCell[],
    edges: AiEdgeCell[],
  ): { nodes: AiNodeCell[]; edges: AiEdgeCell[] } {
    const resultNodes = [...nodes];
    let resultEdges = [...edges];

    for (const fork of resultNodes.filter((node) => this.getNodeType(node) === 'fork')) {
      let outgoing = resultEdges.filter((edge) => edge.source.cell === fork.id);

      while (outgoing.length < 2) {
        const index = outgoing.length + 1;

        const branchNode = this.createNode(
          'task',
          `Actividad paralela ${index}`,
          fork.x + 300,
          fork.y + (index === 1 ? -120 : 120),
          `${fork.id}-branch-${index}`,
        );

        resultNodes.push(branchNode);

        resultEdges.push(this.createEdge(`${fork.id}-to-${branchNode.id}`, fork.id, branchNode.id));

        outgoing = resultEdges.filter((edge) => edge.source.cell === fork.id);
      }

      const branchTargetIds = outgoing.map((edge) => edge.target.cell);
      const joinsFound = branchTargetIds
        .map((targetId) =>
          this.findFirstReachableNodeByType(targetId, 'join', resultNodes, resultEdges),
        )
        .filter(Boolean) as string[];

      const uniqueJoins = [...new Set(joinsFound)];

      let joinId = uniqueJoins.length === 1 ? uniqueJoins[0] : '';

      if (!joinId) {
        const joinNode = this.createNode('join', 'Join', fork.x + 650, fork.y, `${fork.id}-join`);

        resultNodes.push(joinNode);
        joinId = joinNode.id;
      }

      for (const branchStartId of branchTargetIds) {
        if (this.pathReachesNode(branchStartId, joinId, resultEdges)) {
          continue;
        }

        const leafId = this.findBranchLeafBeforeEnd(branchStartId, resultNodes, resultEdges);

        if (leafId && leafId !== joinId) {
          resultEdges.push(this.createEdge(`${leafId}-to-${joinId}`, leafId, joinId));
        }
      }

      const joinOutgoing = resultEdges.filter((edge) => edge.source.cell === joinId);

      if (!joinOutgoing.length) {
        let endNode = resultNodes.find((node) => this.getNodeType(node) === 'end');

        if (!endNode) {
          endNode = this.createNode('end', 'Fin', fork.x + 950, fork.y, `${fork.id}-end`);
          resultNodes.push(endNode);
        }

        resultEdges.push(this.createEdge(`${joinId}-to-${endNode.id}`, joinId, endNode.id));
      }
    }

    return {
      nodes: resultNodes,
      edges: resultEdges,
    };
  }

  private repairBasicOrphans(nodes: AiNodeCell[], edges: AiEdgeCell[]): AiEdgeCell[] {
    const resultEdges = [...edges];
    const orderedNodes = [...nodes].sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
    });

    const startNode = orderedNodes.find((node) => this.getNodeType(node) === 'start');
    const endNode = orderedNodes.find((node) => this.getNodeType(node) === 'end');

    if (!startNode || !endNode) return resultEdges;

    const hasOutgoing = (nodeId: string) => resultEdges.some((edge) => edge.source.cell === nodeId);

    const hasIncoming = (nodeId: string) => resultEdges.some((edge) => edge.target.cell === nodeId);

    if (!hasOutgoing(startNode.id)) {
      const firstOperational = orderedNodes.find((node) => {
        const type = this.getNodeType(node);
        return type !== 'start' && type !== 'end';
      });

      if (firstOperational) {
        resultEdges.push(
          this.createEdge(
            `${startNode.id}-to-${firstOperational.id}`,
            startNode.id,
            firstOperational.id,
          ),
        );
      }
    }

    for (const node of orderedNodes) {
      const type = this.getNodeType(node);

      if (type !== 'start' && !hasIncoming(node.id)) {
        const previous = this.findPreviousConnectableNode(node, orderedNodes, resultEdges);

        if (previous) {
          resultEdges.push(this.createEdge(`${previous.id}-to-${node.id}`, previous.id, node.id));
        }
      }

      if (!['end', 'decision', 'fork'].includes(type) && !hasOutgoing(node.id)) {
        resultEdges.push(this.createEdge(`${node.id}-to-${endNode.id}`, node.id, endNode.id));
      }
    }

    return resultEdges;
  }

  private findPreviousConnectableNode(
    node: AiNodeCell,
    orderedNodes: AiNodeCell[],
    edges: AiEdgeCell[],
  ): AiNodeCell | null {
    const index = orderedNodes.findIndex((item) => item.id === node.id);

    for (let i = index - 1; i >= 0; i--) {
      const candidate = orderedNodes[i];
      const type = this.getNodeType(candidate);

      if (type === 'end') continue;
      if (type === 'decision') continue;
      if (type === 'fork') continue;

      const alreadyConnected = edges.some(
        (edge) => edge.source.cell === candidate.id && edge.target.cell === node.id,
      );

      if (!alreadyConnected) {
        return candidate;
      }
    }

    return null;
  }

  private normalizeSingleStartAndEnd(
    nodes: AiNodeCell[],
    edges: AiEdgeCell[],
  ): { nodes: AiNodeCell[]; edges: AiEdgeCell[] } {
    const startNodes = nodes
      .filter((node) => this.getNodeType(node) === 'start')
      .sort((a, b) => {
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });

    const endNodes = nodes
      .filter((node) => this.getNodeType(node) === 'end')
      .sort((a, b) => {
        if (a.x !== b.x) return b.x - a.x;
        return b.y - a.y;
      });

    const mainStart = startNodes[0];
    const mainEnd = endNodes[0];

    if (!mainStart || !mainEnd) {
      return { nodes, edges };
    }

    const duplicatedStartIds = new Set(startNodes.slice(1).map((node) => node.id));

    const duplicatedEndIds = new Set(endNodes.slice(1).map((node) => node.id));

    const normalizedNodes = nodes.filter((node) => {
      if (duplicatedStartIds.has(node.id)) return false;
      if (duplicatedEndIds.has(node.id)) return false;
      return true;
    });

    const normalizedEdges = edges
      .map((edge) => {
        if (duplicatedStartIds.has(edge.source.cell)) {
          return null;
        }

        if (duplicatedStartIds.has(edge.target.cell)) {
          return null;
        }

        if (duplicatedEndIds.has(edge.source.cell)) {
          return null;
        }

        if (duplicatedEndIds.has(edge.target.cell)) {
          return {
            ...edge,
            target: {
              ...edge.target,
              cell: mainEnd.id,
            },
          };
        }

        return edge;
      })
      .filter((edge): edge is AiEdgeCell => !!edge);

    return {
      nodes: normalizedNodes,
      edges: this.removeDuplicatedEdges(normalizedEdges),
    };
  }

  private anyNodeToCell(node: any, index = 0): AiNodeCell {
    const data = {
      ...(node?.data || {}),
    };

    const nodeType = this.normalizeNodeType(
      data.nodeType || node?.nodeType || this.getNodeTypeFromShape(node?.shape || ''),
    );

    const id = this.safeId(node?.id || `${nodeType}-${index + 1}`);
    const label = String(node?.label || data.label || this.defaultLabelForType(nodeType));

    const shape = this.getShapeFromNodeType(nodeType);

    const normalizedData: Record<string, any> = {
      label,
      nodeType,
      departmentId: '',
      departmentName: '',
      instructions: '',
      aiAlias: '',
      ...data,
    };

    if (nodeType === 'decision') {
      normalizedData['decisionMode'] = 'MANUAL';
      normalizedData['decisionQuestion'] =
        normalizedData['decisionQuestion'] || label || 'Seleccione una opción';
      normalizedData['decisionOptions'] = [
        { value: 'SI', label: 'Sí' },
        { value: 'NO', label: 'No' },
      ];
    }

    if (['start', 'end', 'fork', 'join'].includes(nodeType)) {
      normalizedData['departmentId'] = '';
      normalizedData['departmentName'] = '';
    }

    return {
      ...node,
      id,
      shape,
      x: Number(node?.x ?? 100 + index * 260),
      y: Number(node?.y ?? 180),
      label,
      data: normalizedData,
      attrs: node?.attrs,
    };
  }

  private aiNodeToCell(node: WorkflowAiNode, index = 0): AiNodeCell {
    return this.anyNodeToCell(node, index);
  }

  private anyEdgeToCell(edge: any, index = 0): AiEdgeCell {
    const sourceCell = typeof edge?.source === 'string' ? edge.source : edge?.source?.cell;

    const targetCell = typeof edge?.target === 'string' ? edge.target : edge?.target?.cell;

    const conditionValue =
      edge?.conditionValue || edge?.data?.conditionValue || edge?.attrs?.label?.text || '';

    const id = this.safeId(edge?.id || `edge-${index + 1}`);

    const normalized: AiEdgeCell = {
      ...edge,
      id,
      shape: 'edge',
      source: {
        cell: String(sourceCell || ''),
        port:
          edge?.source?.port && String(edge.source.port).startsWith('out')
            ? edge.source.port
            : 'out-1',
      },
      target: {
        cell: String(targetCell || ''),
        port:
          edge?.target?.port && String(edge.target.port).startsWith('in')
            ? edge.target.port
            : 'in-1',
      },
      attrs: edge?.attrs ?? {
        line: {
          stroke: '#64748b',
          strokeWidth: 2,
          targetMarker: {
            name: 'classic',
            size: 8,
          },
        },
      },
      data: {
        ...(edge?.data || {}),
      },
    };

    if (conditionValue) {
      this.applyDecisionCondition(normalized, String(conditionValue).toUpperCase());
    }

    return normalized;
  }

  private aiEdgeToCell(edge: WorkflowAiEdge, index = 0): AiEdgeCell {
    return this.anyEdgeToCell(edge, index);
  }

  private createNode(
    nodeType: NodeType,
    label: string,
    x: number,
    y: number,
    id: string,
  ): AiNodeCell {
    return this.anyNodeToCell(
      {
        id,
        shape: this.getShapeFromNodeType(nodeType),
        x,
        y,
        label,
        data: {
          label,
          nodeType,
        },
      },
      0,
    );
  }

  private createEdge(
    id: string,
    sourceCell: string,
    targetCell: string,
    conditionValue?: string,
  ): AiEdgeCell {
    const edge: AiEdgeCell = {
      id: this.safeId(id),
      shape: 'edge',
      source: { cell: sourceCell, port: 'out-1' },
      target: { cell: targetCell, port: 'in-1' },
      attrs: {
        line: {
          stroke: '#64748b',
          strokeWidth: 2,
          targetMarker: {
            name: 'classic',
            size: 8,
          },
        },
      },
      data: {},
    };

    if (conditionValue) {
      this.applyDecisionCondition(edge, conditionValue);
    }

    return edge;
  }

  private applyDecisionCondition(edge: AiEdgeCell, value: string): void {
    const normalizedValue = value.toUpperCase() === 'NO' ? 'NO' : 'SI';
    const label = normalizedValue === 'SI' ? 'Sí' : 'No';

    edge.conditionValue = normalizedValue;
    edge.data = {
      ...(edge.data || {}),
      conditionValue: normalizedValue,
    };
    edge.labels = [
      {
        attrs: {
          label: {
            text: label,
          },
        },
      },
    ];
  }

  private removeInvalidEdges(nodes: AiNodeCell[], edges: AiEdgeCell[]): AiEdgeCell[] {
    const nodeIds = new Set(nodes.map((node) => node.id));

    return edges.filter((edge) => {
      if (!edge.source?.cell || !edge.target?.cell) return false;
      if (edge.source.cell === edge.target.cell) return false;
      return nodeIds.has(edge.source.cell) && nodeIds.has(edge.target.cell);
    });
  }

  private removeDuplicatedEdges(edges: AiEdgeCell[]): AiEdgeCell[] {
    const seen = new Set<string>();

    return edges.filter((edge) => {
      const key = `${edge.source.cell}->${edge.target.cell}:${edge.conditionValue || ''}`;

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }

  private ensureUniqueNodeIds(nodes: AiNodeCell[]): AiNodeCell[] {
    const used = new Set<string>();

    return nodes.map((node, index) => {
      let id = this.safeId(node.id || `node-${index + 1}`);

      if (used.has(id)) {
        id = `${id}-${index + 1}`;
      }

      used.add(id);

      return {
        ...node,
        id,
      };
    });
  }

  private ensureUniqueEdgeIds(edges: AiEdgeCell[]): AiEdgeCell[] {
    const used = new Set<string>();

    return edges.map((edge, index) => {
      let id = this.safeId(edge.id || `edge-${index + 1}`);

      if (used.has(id)) {
        id = `${id}-${index + 1}`;
      }

      used.add(id);

      return {
        ...edge,
        id,
      };
    });
  }

  private findFirstReachableNodeByType(
    startNodeId: string,
    targetType: NodeType,
    nodes: AiNodeCell[],
    edges: AiEdgeCell[],
    visited = new Set<string>(),
  ): string | null {
    if (!startNodeId || visited.has(startNodeId)) return null;

    visited.add(startNodeId);

    const node = nodes.find((item) => item.id === startNodeId);

    if (!node) return null;

    if (this.getNodeType(node) === targetType) {
      return node.id;
    }

    const outgoing = edges.filter((edge) => edge.source.cell === startNodeId);

    for (const edge of outgoing) {
      const found = this.findFirstReachableNodeByType(
        edge.target.cell,
        targetType,
        nodes,
        edges,
        visited,
      );

      if (found) return found;
    }

    return null;
  }

  private pathReachesNode(
    startNodeId: string,
    targetNodeId: string,
    edges: AiEdgeCell[],
    visited = new Set<string>(),
  ): boolean {
    if (!startNodeId || !targetNodeId) return false;
    if (startNodeId === targetNodeId) return true;
    if (visited.has(startNodeId)) return false;

    visited.add(startNodeId);

    const outgoing = edges.filter((edge) => edge.source.cell === startNodeId);

    for (const edge of outgoing) {
      if (this.pathReachesNode(edge.target.cell, targetNodeId, edges, visited)) {
        return true;
      }
    }

    return false;
  }

  private findBranchLeafBeforeEnd(
    startNodeId: string,
    nodes: AiNodeCell[],
    edges: AiEdgeCell[],
  ): string {
    let currentId = startNodeId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const currentNode = nodes.find((node) => node.id === currentId);
      const currentType = currentNode ? this.getNodeType(currentNode) : 'task';

      if (currentType === 'join') return currentId;

      const outgoing = edges.filter((edge) => edge.source.cell === currentId);

      if (!outgoing.length) return currentId;

      const nextId = outgoing[0].target.cell;
      const nextNode = nodes.find((node) => node.id === nextId);
      const nextType = nextNode ? this.getNodeType(nextNode) : 'task';

      if (nextType === 'end') return currentId;

      currentId = nextId;
    }

    return startNodeId;
  }

  private getNodeType(node: AiNodeCell): NodeType {
    return this.normalizeNodeType(
      node?.data?.['nodeType'] || this.getNodeTypeFromShape(node?.shape || ''),
    );
  }

  private normalizeNodeType(value: string): NodeType {
    const normalized = String(value || '')
      .toLowerCase()
      .trim();

    if (normalized.includes('start') || normalized === 'inicio') return 'start';
    if (normalized.includes('decision') || normalized.includes('diamond')) return 'decision';
    if (normalized.includes('fork')) return 'fork';
    if (normalized.includes('join')) return 'join';
    if (normalized.includes('end') || normalized === 'fin') return 'end';

    return 'task';
  }

  private getNodeTypeFromShape(shape: string): NodeType {
    if (shape === 'workflow-start') return 'start';
    if (shape === 'workflow-decision') return 'decision';
    if (shape === 'workflow-fork') return 'fork';
    if (shape === 'workflow-join') return 'join';
    if (shape === 'workflow-end') return 'end';

    return 'task';
  }

  private getShapeFromNodeType(nodeType: NodeType): string {
    switch (nodeType) {
      case 'start':
        return 'workflow-start';
      case 'decision':
        return 'workflow-decision';
      case 'fork':
        return 'workflow-fork';
      case 'join':
        return 'workflow-join';
      case 'end':
        return 'workflow-end';
      default:
        return 'workflow-task';
    }
  }

  private defaultLabelForType(nodeType: NodeType): string {
    switch (nodeType) {
      case 'start':
        return 'Inicio';
      case 'decision':
        return 'Decisión';
      case 'fork':
        return 'Fork';
      case 'join':
        return 'Join';
      case 'end':
        return 'Fin';
      default:
        return 'Actividad';
    }
  }

  private isDeleteAction(cell: any): boolean {
    const action = String(cell?.data?.action || cell?.action || '').toLowerCase();
    return action === 'delete' || action === 'remove' || action === 'eliminar';
  }

  private safeId(value: string): string {
    const clean = String(value || 'id')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    return clean || `id-${Date.now()}`;
  }
}
