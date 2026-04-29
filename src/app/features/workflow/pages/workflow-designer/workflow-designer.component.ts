import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, timeout } from 'rxjs';
import { WorkflowService } from '../../services/workflow.service';
import { DepartmentService } from '../../../departments/services/department.service';
import { Department } from '../../../departments/models/department.model';
import { WorkflowStatus } from '../../models/workflow.model';
import { Subject, debounceTime } from 'rxjs';
import { WorkflowRealtimeService } from '../../services/workflow-realtime.service';
import { environment } from '../../../../../environments/environment';
import { WorkflowDesignerAiFacade } from './workflow-designer-ai.facade';

type NodeType = 'start' | 'task' | 'decision' | 'fork' | 'join' | 'end';

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

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './workflow-designer.component.html',
  styleUrl: './workflow-designer.component.css',
})
export class WorkflowDesignerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workflowService = inject(WorkflowService);
  private departmentService = inject(DepartmentService);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);
  private workflowDesignerAi = inject(WorkflowDesignerAiFacade);

  aiPrompt = '';
  aiWorking = false;
  aiError = '';
  aiSummary = '';

  listening = false;
  speechSupported = false;
  autoSendVoiceCommand = true;
  recognition: any = null;

  graph: any = null;

  selectedDecisionEdges: Array<{
    edgeId: string;
    targetId: string;
    targetLabel: string;
    conditionValue: string;
  }> = [];

  projectId = '';
  workflowId = '';

  loading = true;
  saving = false;
  message = '';
  errorMessage = '';

  workflowStatus: WorkflowStatus = 'DRAFT';

  selectedNode: any = null;
  departments: Department[] = [];

  nodeForm: WorkflowNodeConfig = this.createEmptyNodeConfig('task');

  get isPublished(): boolean {
    return this.workflowStatus === 'PUBLISHED';
  }

  get isDecisionNodeSelected(): boolean {
    return this.nodeForm.nodeType === 'decision';
  }

  private safeUiUpdate(fn: () => void): void {
    setTimeout(() => {
      fn();
      this.cdr.detectChanges();
    }, 0);
  }

  private workflowRealtimeService = inject(WorkflowRealtimeService);

  private graphChanges$ = new Subject<void>();
  private stompSubscription: any = null;

  clientId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  isApplyingRemote = false;
  realtimeConnected = false;

  private getRealtimeSnapshot(): { nodes: any[]; edges: any[] } {
    const json = this.graph?.toJSON?.() || {};
    const cells = (json.cells || []) as any[];

    return {
      nodes: cells.filter((c) => !c.source),
      edges: cells.filter((c) => !!c.source && !!c.target),
    };
  }

  private applyRemoteSnapshot(payload: { nodes: any[]; edges: any[] }): void {
    if (!this.graph) return;

    this.isApplyingRemote = true;

    try {
      this.graph.clearCells();

      this.graph.fromJSON({
        cells: [...(payload.nodes || []), ...(payload.edges || [])],
      });

      this.clearSelection();
      this.resizeGraph();
      this.message = 'Diagrama actualizado en tiempo real';
      this.errorMessage = '';
    } finally {
      setTimeout(() => {
        this.isApplyingRemote = false;
        this.cdr.detectChanges();
      }, 0);
    }
  }
  private notifyGraphChanged(): void {
    if (this.isApplyingRemote || this.loading || this.isPublished) return;
    this.graphChanges$.next();
  }

  private setupRealtime(): void {
    const wsBaseUrl = environment.wsUrl;

    this.workflowRealtimeService.connect(
      wsBaseUrl,
      () => {
        this.realtimeConnected = true;
        this.cdr.detectChanges();

        this.stompSubscription?.unsubscribe?.();
        this.stompSubscription = this.workflowRealtimeService.subscribe(
          this.workflowId,
          (payload) => {
            if (!payload || payload.clientId === this.clientId) return;
            if (payload.workflowId !== this.workflowId) return;

            this.applyRemoteSnapshot({
              nodes: payload.nodes || [],
              edges: payload.edges || [],
            });
          },
        );
      },
      (error) => {
        console.error('Error WebSocket:', error);
        this.realtimeConnected = false;
        this.cdr.detectChanges();
      },
    );

    this.graphChanges$.pipe(debounceTime(500)).subscribe(() => {
      if (!this.graph) return;
      if (!this.workflowRealtimeService.isConnected) return;

      const snapshot = this.getRealtimeSnapshot();

      this.workflowRealtimeService.publish(this.workflowId, {
        workflowId: this.workflowId,
        projectId: this.projectId,
        clientId: this.clientId,
        nodes: snapshot.nodes,
        edges: snapshot.edges,
      });
    });
  }

  ensureDecisionConfig(): void {
    if (this.nodeForm.nodeType !== 'decision') {
      return;
    }

    this.nodeForm.decisionMode = 'MANUAL';
    this.nodeForm.decisionQuestion =
      this.nodeForm.decisionQuestion?.trim() || 'Seleccione una opción';

    if (!this.nodeForm.decisionOptions || this.nodeForm.decisionOptions.length < 2) {
      this.nodeForm.decisionOptions = [
        { value: 'SI', label: 'Sí' },
        { value: 'NO', label: 'No' },
      ];
    }
  }

  onNodeTypeChange(): void {
    if (this.nodeForm.nodeType === 'decision') {
      this.ensureDecisionConfig();
      this.loadDecisionEdges();
      return;
    }

    this.nodeForm.decisionMode = undefined;
    this.nodeForm.decisionQuestion = '';
    this.nodeForm.decisionOptions = [];
    this.selectedDecisionEdges = [];
  }

  loadDecisionEdges(): void {
    this.selectedDecisionEdges = [];

    if (!this.selectedNode || this.nodeForm.nodeType !== 'decision' || !this.graph) {
      return;
    }

    const currentNodeId = this.selectedNode.id;
    const rawEdges = this.graph.getEdges() || [];

    this.selectedDecisionEdges = rawEdges
      .filter((edge: any) => {
        const source = edge.getSource?.();
        const sourceCell = typeof source === 'string' ? source : source?.cell;
        return sourceCell === currentNodeId;
      })
      .map((edge: any) => {
        const target = edge.getTarget?.();
        const targetCell = typeof target === 'string' ? target : target?.cell;
        const targetNode = this.graph.getCellById(targetCell);

        const currentLabel =
          edge.getData?.()?.conditionValue ||
          edge.getPropByPath?.('conditionValue') ||
          edge.prop?.('conditionValue') ||
          '';
        return {
          edgeId: edge.id,
          targetId: targetCell,
          targetLabel:
            targetNode?.getData?.()?.label ||
            targetNode?.attr?.('label/text') ||
            targetCell ||
            'Nodo',
          conditionValue: currentLabel,
        };
      });
  }
  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') || '';
    this.workflowId = this.route.snapshot.paramMap.get('workflowId') || '';
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.speechSupported = this.hasSpeechRecognition();

    await this.initGraph();
    this.setupRealtime();
    this.loadInitialData();
  }

  private hasSpeechRecognition(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }

  toggleVoiceInput(): void {
    if (this.listening) {
      this.stopVoiceInput();
      return;
    }

    this.startVoiceInput();
  }

  startVoiceInput(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.safeUiUpdate(() => {
        this.speechSupported = false;
        this.errorMessage = 'Tu navegador no soporta reconocimiento de voz';
      });
      return;
    }

    if (this.aiWorking || this.loading || this.isPublished) return;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-ES';
    this.recognition.interimResults = false;
    this.recognition.continuous = false;
    this.recognition.maxAlternatives = 1;

    this.safeUiUpdate(() => {
      this.errorMessage = '';
      this.message = '';
      this.listening = true;
    });

    this.recognition.onstart = () => {
      this.safeUiUpdate(() => {
        this.listening = true;
      });
    };

    this.recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';

      this.safeUiUpdate(() => {
        this.aiPrompt = transcript.trim();
      });
    };

    this.recognition.onerror = (event: any) => {
      this.safeUiUpdate(() => {
        this.listening = false;

        if (event?.error !== 'no-speech' && event?.error !== 'aborted') {
          this.errorMessage = 'No se pudo capturar el audio correctamente';
        }
      });
    };

    this.recognition.onend = () => {
      const capturedPrompt = (this.aiPrompt || '').trim();

      this.safeUiUpdate(() => {
        this.listening = false;
      });

      if (this.autoSendVoiceCommand && capturedPrompt && !this.aiWorking) {
        setTimeout(() => this.submitAiPrompt(), 0);
      }
    };

    this.recognition.start();
  }

  stopVoiceInput(): void {
    try {
      this.recognition?.stop?.();
    } catch {}

    this.safeUiUpdate(() => {
      this.listening = false;
    });
  }

  ngOnDestroy(): void {
    try {
      this.recognition?.stop?.();
    } catch {}

    this.stompSubscription?.unsubscribe?.();
    this.workflowRealtimeService.disconnect();

    this.graph?.dispose?.();
  }

  private async initGraph(): Promise<void> {
    const x6 = await import('@antv/x6');
    const Graph = x6.Graph;
    const Shape = x6.Shape;

    this.registerCustomNodes(Graph);

    this.graph = new Graph({
      container: this.containerRef.nativeElement,
      width: this.containerRef.nativeElement.clientWidth || 1000,
      height: this.containerRef.nativeElement.clientHeight || 680,
      background: {
        color: '#f8fafc',
      },
      grid: {
        visible: true,
        type: 'dot',
        args: {
          color: '#cbd5e1',
          thickness: 1,
        },
      },
      panning: true,
      mousewheel: {
        enabled: true,
        modifiers: ['ctrl', 'meta'],
        minScale: 0.5,
        maxScale: 2,
      },
      connecting: {
        router: 'manhattan',
        connector: 'rounded',
        anchor: 'center',
        connectionPoint: 'anchor',
        allowBlank: false,
        snap: true,
        highlight: true,
        allowNode: false,
        allowEdge: false,
        allowLoop: true,
        createEdge() {
          return new Shape.Edge({
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
          });
        },
        validateConnection({ sourceCell, targetCell, sourceMagnet, targetMagnet }: any) {
          if (!sourceCell || !targetCell) return false;
          if (!sourceMagnet || !targetMagnet) return false;

          const sourcePortGroup = sourceMagnet.getAttribute('port-group');
          const targetPortGroup = targetMagnet.getAttribute('port-group');

          return sourcePortGroup === 'out' && targetPortGroup === 'in';
        },
      },
      interacting: {
        edgeLabelMovable: false,
      },
    });

    if (this.graph.enableSelection) {
      this.graph.enableSelection();
    }

    this.graph.on('node:click', ({ node }: any) => {
      this.selectedNode = node;
      this.nodeForm = this.getNodeConfig(node);

      if (this.nodeForm.nodeType === 'decision') {
        this.ensureDecisionConfig();
        this.loadDecisionEdges();
      } else {
        this.selectedDecisionEdges = [];
      }

      this.message = '';
      this.errorMessage = '';
      this.cdr.detectChanges();
    });

    this.graph.on('blank:click', () => {
      this.clearSelection();
    });

    if (this.graph.bindKey) {
      this.graph.bindKey(['backspace', 'delete'], () => {
        if (this.loading || this.isPublished) return false;

        const cells = this.graph.getSelectedCells?.() || [];
        if (cells.length) {
          this.graph.removeCells(cells);

          if (this.selectedNode && cells.some((c: any) => c.id === this.selectedNode.id)) {
            this.clearSelection();
          } else {
            this.cdr.detectChanges();
          }
        }

        return false;
      });
    }

    // Realtime: cambios en nodos
    this.graph.on('node:added', () => this.notifyGraphChanged());
    this.graph.on('node:removed', () => this.notifyGraphChanged());
    this.graph.on('node:change:position', () => this.notifyGraphChanged());
    this.graph.on('node:change:data', () => this.notifyGraphChanged());

    // Realtime: cambios en edges
    this.graph.on('edge:added', () => this.notifyGraphChanged());
    this.graph.on('edge:removed', () => this.notifyGraphChanged());
    this.graph.on('edge:change:source', () => this.notifyGraphChanged());
    this.graph.on('edge:change:target', () => this.notifyGraphChanged());
    this.graph.on('edge:change:labels', () => this.notifyGraphChanged());
  }

  private loadInitialData(): void {
    this.loading = true;
    this.message = '';
    this.errorMessage = '';

    forkJoin({
      workflow: this.workflowService
        .getWorkflow(this.projectId, this.workflowId)
        .pipe(timeout(8000)),
      departments: this.departmentService.getDepartments(this.projectId).pipe(timeout(8000)),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.resizeGraph();
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: ({ workflow, departments }) => {
          this.departments = departments ?? [];
          this.workflowStatus = workflow?.status || 'DRAFT';

          this.graph.clearCells();

          if (workflow?.nodes?.length || workflow?.edges?.length) {
            this.graph.fromJSON({
              cells: [...(workflow.nodes || []), ...(workflow.edges || [])],
            });
          }
        },
        error: (error) => {
          console.error('Error cargando workflow:', error);
          this.errorMessage = 'No se pudo cargar el flujo';
        },
      });
  }

  private clearSelection(): void {
    this.selectedNode = null;
    this.selectedDecisionEdges = [];
    this.nodeForm = this.createEmptyNodeConfig('task');
    this.cdr.detectChanges();
  }

  saveDecisionEdgeConditions(): void {
    if (!this.graph || !this.selectedDecisionEdges.length) {
      return;
    }

    for (const item of this.selectedDecisionEdges) {
      const edge = this.graph.getCellById(item.edgeId);

      if (!edge) continue;

      const existingData = edge.getData?.() || {};

      edge.setData?.({
        ...existingData,
        conditionValue: item.conditionValue,
      });

      edge.prop?.('conditionValue', item.conditionValue);

      const optionLabel =
        this.nodeForm.decisionOptions?.find((opt) => opt.value === item.conditionValue)?.label ||
        item.conditionValue ||
        '';

      if (optionLabel) {
        edge.setLabels?.([
          {
            attrs: {
              label: {
                text: optionLabel,
              },
            },
          },
        ]);
      }
    }
  }

  private createEmptyNodeConfig(nodeType: NodeType): WorkflowNodeConfig {
    return {
      label: '',
      nodeType,
      departmentId: '',
      departmentName: '',
      instructions: '',
      decisionMode: nodeType === 'decision' ? 'MANUAL' : undefined,
      decisionQuestion: nodeType === 'decision' ? 'Seleccione una opción' : '',
      decisionOptions:
        nodeType === 'decision'
          ? [
              { value: 'SI', label: 'Sí' },
              { value: 'NO', label: 'No' },
            ]
          : [],
    };
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

  private getNodeConfig(node: any): WorkflowNodeConfig {
    const data = node?.getData?.() || {};
    const nodeType = this.getNodeTypeFromShape(node?.shape || '');

    return {
      ...this.createEmptyNodeConfig(nodeType),
      ...data,
      label: data?.label || this.getNodeLabel(node) || '',
    };
  }

  private basePorts() {
    return {
      groups: {
        in: {
          position: 'top',
          attrs: {
            circle: {
              r: 6,
              magnet: 'passive',
              stroke: '#475569',
              strokeWidth: 2,
              fill: '#ffffff',
            },
          },
        },
        out: {
          position: 'bottom',
          attrs: {
            circle: {
              r: 6,
              magnet: true,
              stroke: '#475569',
              strokeWidth: 2,
              fill: '#ffffff',
            },
          },
        },
      },
      items: [
        { id: 'in-1', group: 'in' },
        { id: 'out-1', group: 'out' },
      ],
    };
  }

  private registerCustomNodes(Graph: any): void {
    const ports = this.basePorts();

    Graph.registerNode(
      'workflow-start',
      {
        inherit: 'rect',
        width: 140,
        height: 48,
        ports,
        attrs: {
          body: {
            rx: 24,
            ry: 24,
            fill: '#dcfce7',
            stroke: '#16a34a',
            strokeWidth: 2,
          },
          label: {
            fill: '#166534',
            fontSize: 14,
            fontWeight: 700,
          },
        },
      },
      true,
    );

    Graph.registerNode(
      'workflow-task',
      {
        inherit: 'rect',
        width: 170,
        height: 60,
        ports,
        attrs: {
          body: {
            rx: 16,
            ry: 16,
            fill: '#dbeafe',
            stroke: '#2563eb',
            strokeWidth: 2,
          },
          label: {
            fill: '#1e3a8a',
            fontSize: 14,
            fontWeight: 600,
          },
        },
      },
      true,
    );

    Graph.registerNode(
      'workflow-decision',
      {
        inherit: 'polygon',
        width: 120,
        height: 120,
        ports,
        attrs: {
          body: {
            refPoints: '0,10 10,0 20,10 10,20',
            fill: '#fef3c7',
            stroke: '#d97706',
            strokeWidth: 2,
          },
          label: {
            fill: '#92400e',
            fontSize: 14,
            fontWeight: 700,
          },
        },
      },
      true,
    );

    Graph.registerNode(
      'workflow-fork',
      {
        inherit: 'rect',
        width: 180,
        height: 18,
        ports,
        attrs: {
          body: {
            rx: 8,
            ry: 8,
            fill: '#ede9fe',
            stroke: '#7c3aed',
            strokeWidth: 2,
          },
          label: {
            fill: '#5b21b6',
            fontSize: 12,
            fontWeight: 700,
          },
        },
      },
      true,
    );

    Graph.registerNode(
      'workflow-join',
      {
        inherit: 'rect',
        width: 180,
        height: 18,
        ports,
        attrs: {
          body: {
            rx: 8,
            ry: 8,
            fill: '#fae8ff',
            stroke: '#c026d3',
            strokeWidth: 2,
          },
          label: {
            fill: '#a21caf',
            fontSize: 12,
            fontWeight: 700,
          },
        },
      },
      true,
    );

    Graph.registerNode(
      'workflow-end',
      {
        inherit: 'rect',
        width: 140,
        height: 48,
        ports,
        attrs: {
          body: {
            rx: 24,
            ry: 24,
            fill: '#fee2e2',
            stroke: '#dc2626',
            strokeWidth: 2,
          },
          label: {
            fill: '#991b1b',
            fontSize: 14,
            fontWeight: 700,
          },
        },
      },
      true,
    );
  }

  private resizeGraph(): void {
    setTimeout(() => {
      this.graph?.resize?.(
        this.containerRef?.nativeElement?.clientWidth || 1000,
        this.containerRef?.nativeElement?.clientHeight || 680,
      );
      this.graph?.centerContent?.();
    }, 0);
  }

  private getNodeLabel(node: any): string {
    return node?.attr?.('label/text') || node?.getAttrs?.()?.label?.text || '';
  }

  private buildNodePayload(
    nodeType: string,
    label: string,
    extraData: Record<string, any> = {},
  ): Record<string, any> {
    return {
      label,
      nodeType,
      departmentId: '',
      departmentName: '',
      instructions: '',
      aiAlias: '',
      ...extraData,
    };
  }

  private buildEdge(id: string, sourceCell: string, targetCell: string) {
    return {
      id,
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
    };
  }

  private replaceWithTemplate(nodes: any[], edges: any[], message: string): void {
    if (!this.graph || this.isPublished) {
      this.errorMessage = 'El workflow está en producción y no puede editarse';
      return;
    }

    const confirmed =
      !this.graph.getCells || this.graph.getCells().length === 0
        ? true
        : window.confirm('Esto reemplazará el diagrama actual. ¿Deseas continuar?');

    if (!confirmed) return;

    this.graph.clearCells();
    this.graph.fromJSON({ nodes, edges });
    this.clearSelection();
    this.message = message;
    this.errorMessage = '';
    this.resizeGraph();
    this.cdr.detectChanges();
  }

  applyLinearTemplate(): void {
    const nodes = [
      {
        id: 'linear-start',
        shape: 'workflow-start',
        x: 80,
        y: 120,
        label: 'Inicio',
        data: this.buildNodePayload('start', 'Inicio'),
      },
      {
        id: 'linear-task-1',
        shape: 'workflow-task',
        x: 320,
        y: 110,
        label: 'Actividad',
        data: this.buildNodePayload('task', 'Actividad'),
      },
      {
        id: 'linear-end',
        shape: 'workflow-end',
        x: 620,
        y: 120,
        label: 'Fin',
        data: this.buildNodePayload('end', 'Fin'),
      },
    ];

    const edges = [
      this.buildEdge('linear-edge-1', 'linear-start', 'linear-task-1'),
      this.buildEdge('linear-edge-2', 'linear-task-1', 'linear-end'),
    ];

    this.replaceWithTemplate(nodes, edges, 'Plantilla lineal aplicada');
  }
  applyConditionalTemplate(): void {
    const nodes = [
      {
        id: 'cond-start',
        shape: 'workflow-start',
        x: 80,
        y: 180,
        label: 'Inicio',
        data: this.buildNodePayload('start', 'Inicio'),
      },
      {
        id: 'cond-decision',
        shape: 'workflow-decision',
        x: 300,
        y: 140,
        label: 'Decisión',
        data: this.buildNodePayload('decision', 'Decisión', {
          decisionMode: 'MANUAL',
          decisionQuestion: 'Seleccione una opción',
          decisionOptions: [
            { value: 'SI', label: 'Sí' },
            { value: 'NO', label: 'No' },
          ],
        }),
      },
      {
        id: 'cond-task-yes',
        shape: 'workflow-task',
        x: 560,
        y: 40,
        label: 'Ruta Sí',
        data: this.buildNodePayload('task', 'Ruta Sí'),
      },
      {
        id: 'cond-task-no',
        shape: 'workflow-task',
        x: 560,
        y: 250,
        label: 'Ruta No',
        data: this.buildNodePayload('task', 'Ruta No'),
      },
      {
        id: 'cond-end',
        shape: 'workflow-end',
        x: 860,
        y: 180,
        label: 'Fin',
        data: this.buildNodePayload('end', 'Fin'),
      },
    ];

    const edges = [
      this.buildEdge('cond-edge-1', 'cond-start', 'cond-decision'),
      {
        ...this.buildEdge('cond-edge-2', 'cond-decision', 'cond-task-yes'),
        conditionValue: 'SI',
        data: { conditionValue: 'SI' },
        labels: [
          {
            attrs: {
              label: {
                text: 'Sí',
              },
            },
          },
        ],
      },
      {
        ...this.buildEdge('cond-edge-3', 'cond-decision', 'cond-task-no'),
        conditionValue: 'NO',
        data: { conditionValue: 'NO' },
        labels: [
          {
            attrs: {
              label: {
                text: 'No',
              },
            },
          },
        ],
      },
      this.buildEdge('cond-edge-4', 'cond-task-yes', 'cond-end'),
      this.buildEdge('cond-edge-5', 'cond-task-no', 'cond-end'),
    ];

    this.replaceWithTemplate(nodes, edges, 'Plantilla condicional aplicada');
  }

  applyParallelTemplate(): void {
    const nodes = [
      {
        id: 'parallel-start',
        shape: 'workflow-start',
        x: 80,
        y: 180,
        label: 'Inicio',
        data: this.buildNodePayload('start', 'Inicio'),
      },
      {
        id: 'parallel-fork',
        shape: 'workflow-fork',
        x: 300,
        y: 190,
        label: 'Fork',
        data: this.buildNodePayload('fork', 'Fork'),
      },
      {
        id: 'parallel-task-1',
        shape: 'workflow-task',
        x: 560,
        y: 60,
        label: 'Actividad A',
        data: this.buildNodePayload('task', 'Actividad A'),
      },
      {
        id: 'parallel-task-2',
        shape: 'workflow-task',
        x: 560,
        y: 300,
        label: 'Actividad B',
        data: this.buildNodePayload('task', 'Actividad B'),
      },
      {
        id: 'parallel-join',
        shape: 'workflow-join',
        x: 860,
        y: 190,
        label: 'Join',
        data: this.buildNodePayload('join', 'Join'),
      },
      {
        id: 'parallel-end',
        shape: 'workflow-end',
        x: 1120,
        y: 180,
        label: 'Fin',
        data: this.buildNodePayload('end', 'Fin'),
      },
    ];

    const edges = [
      this.buildEdge('parallel-edge-1', 'parallel-start', 'parallel-fork'),
      this.buildEdge('parallel-edge-2', 'parallel-fork', 'parallel-task-1'),
      this.buildEdge('parallel-edge-3', 'parallel-fork', 'parallel-task-2'),
      this.buildEdge('parallel-edge-4', 'parallel-task-1', 'parallel-join'),
      this.buildEdge('parallel-edge-5', 'parallel-task-2', 'parallel-join'),
      this.buildEdge('parallel-edge-6', 'parallel-join', 'parallel-end'),
    ];

    this.replaceWithTemplate(nodes, edges, 'Plantilla paralela aplicada');
  }
  applyIterativeTemplate(): void {
    const nodes = [
      {
        id: 'iter-start',
        shape: 'workflow-start',
        x: 80,
        y: 180,
        label: 'Inicio',
        data: this.buildNodePayload('start', 'Inicio'),
      },
      {
        id: 'iter-task',
        shape: 'workflow-task',
        x: 320,
        y: 170,
        label: 'Actividad',
        data: this.buildNodePayload('task', 'Actividad'),
      },
      {
        id: 'iter-decision',
        shape: 'workflow-decision',
        x: 600,
        y: 140,
        label: '¿Repetir?',
        data: this.buildNodePayload('decision', '¿Repetir?', {
          decisionMode: 'MANUAL',
          decisionQuestion: '¿Desea repetir el paso?',
          decisionOptions: [
            { value: 'SI', label: 'Sí' },
            { value: 'NO', label: 'No' },
          ],
        }),
      },
      {
        id: 'iter-end',
        shape: 'workflow-end',
        x: 900,
        y: 180,
        label: 'Fin',
        data: this.buildNodePayload('end', 'Fin'),
      },
    ];

    const edges = [
      this.buildEdge('iter-edge-1', 'iter-start', 'iter-task'),
      this.buildEdge('iter-edge-2', 'iter-task', 'iter-decision'),
      {
        ...this.buildEdge('iter-edge-3', 'iter-decision', 'iter-end'),
        conditionValue: 'NO',
        data: { conditionValue: 'NO' },
        labels: [
          {
            attrs: {
              label: {
                text: 'No',
              },
            },
          },
        ],
      },
      {
        ...this.buildEdge('iter-edge-4', 'iter-decision', 'iter-task'),
        conditionValue: 'SI',
        data: { conditionValue: 'SI' },
        labels: [
          {
            attrs: {
              label: {
                text: 'Sí',
              },
            },
          },
        ],
      },
    ];

    this.replaceWithTemplate(nodes, edges, 'Plantilla iterativa aplicada');
  }

  addStartNode(): void {
    if (this.loading || !this.graph || this.isPublished) return;
    this.graph.addNode({
      shape: 'workflow-start',
      x: 80,
      y: 80,
      label: 'Inicio',
      data: this.buildNodePayload('start', 'Inicio'),
    });
  }

  addTaskNode(): void {
    if (this.loading || !this.graph || this.isPublished) return;
    this.graph.addNode({
      shape: 'workflow-task',
      x: 280,
      y: 80,
      label: 'Actividad',
      data: this.buildNodePayload('task', 'Actividad'),
    });
  }

  addDecisionNode(): void {
    if (this.loading || !this.graph || this.isPublished) return;

    this.graph.addNode({
      shape: 'workflow-decision',
      x: 520,
      y: 60,
      label: 'Decisión',
      data: this.buildNodePayload('decision', 'Decisión', {
        decisionMode: 'MANUAL',
        decisionQuestion: 'Seleccione una opción',
        decisionOptions: [
          { value: 'SI', label: 'Sí' },
          { value: 'NO', label: 'No' },
        ],
      }),
    });
  }

  addForkNode(): void {
    if (this.loading || !this.graph || this.isPublished) return;
    this.graph.addNode({
      shape: 'workflow-fork',
      x: 720,
      y: 90,
      label: 'Fork',
      data: this.buildNodePayload('fork', 'Fork'),
    });
  }

  addJoinNode(): void {
    if (this.loading || !this.graph || this.isPublished) return;
    this.graph.addNode({
      shape: 'workflow-join',
      x: 720,
      y: 180,
      label: 'Join',
      data: this.buildNodePayload('join', 'Join'),
    });
  }

  addEndNode(): void {
    if (this.loading || !this.graph || this.isPublished) return;
    this.graph.addNode({
      shape: 'workflow-end',
      x: 960,
      y: 80,
      label: 'Fin',
      data: this.buildNodePayload('end', 'Fin'),
    });
  }

  openDepartments(): void {
    this.router.navigate(['/projects', this.projectId, 'departments']);
  }

  onDepartmentChange(): void {
    const department = this.departments.find((item) => item.id === this.nodeForm.departmentId);
    this.nodeForm.departmentName = department?.name || '';
  }

  saveSelectedNodeConfig(): void {
    if (!this.selectedNode) return;
    if (this.isPublished) {
      this.errorMessage = 'El workflow está en producción y no puede editarse';
      return;
    }

    if (this.nodeForm.nodeType === 'decision') {
      this.ensureDecisionConfig();
    }

    const cleanLabel = this.nodeForm.label.trim() || 'Sin nombre';
    const nodeType = this.nodeForm.nodeType;
    const nextShape = this.getShapeFromNodeType(nodeType);

    const payload: WorkflowNodeConfig = {
      ...this.nodeForm,
      label: cleanLabel,
    };

    if (nodeType === 'decision') {
      payload.decisionMode = 'MANUAL';
      payload.decisionQuestion = payload.decisionQuestion?.trim() || 'Seleccione una opción';
      payload.decisionOptions =
        payload.decisionOptions && payload.decisionOptions.length >= 2
          ? payload.decisionOptions
          : [
              { value: 'SI', label: 'Sí' },
              { value: 'NO', label: 'No' },
            ];
    } else {
      payload.decisionMode = undefined;
      payload.decisionQuestion = '';
      payload.decisionOptions = [];
    }

    this.selectedNode.attr('label/text', cleanLabel);
    this.selectedNode.setData(payload);

    if (this.selectedNode.shape !== nextShape) {
      this.selectedNode.shape = nextShape;
    }

    if (nodeType === 'decision') {
      this.saveDecisionEdgeConditions();
      this.loadDecisionEdges();
    } else {
      this.selectedDecisionEdges = [];
    }

    this.nodeForm = { ...payload };

    this.message = 'Nodo actualizado correctamente';
    this.errorMessage = '';
    this.saveWorkflow();
    this.cdr.detectChanges();
  }

  deleteSelectedNode(): void {
    if (!this.selectedNode || this.loading) return;
    if (this.isPublished) {
      this.errorMessage = 'El workflow está en producción y no puede editarse';
      return;
    }

    this.graph.removeCell(this.selectedNode);
    this.selectedNode = null;
    this.nodeForm = this.createEmptyNodeConfig('task');
    this.message = 'Nodo eliminado';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  saveWorkflow(): void {
    if (this.loading || !this.graph) return;
    if (this.isPublished) {
      this.errorMessage = 'El workflow está en producción y no puede editarse';
      return;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    const json = this.graph.toJSON();
    const cells = (json.cells || []) as any[];

    const payload = {
      nodes: cells.filter((c) => !c.source) as any,
      edges: cells.filter((c) => !!c.source && !!c.target) as any,
    };

    this.workflowService
      .saveWorkflow(this.projectId, this.workflowId, payload)
      .pipe(
        timeout(8000),
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.message = res?.message || 'Flujo guardado correctamente';
          this.errorMessage = '';
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error guardando workflow:', error);
          this.errorMessage = 'No se pudo guardar el flujo';
          this.cdr.detectChanges();
        },
      });
  }

  submitAiPrompt(): void {
    if (!this.aiPrompt.trim() || this.aiWorking || this.loading || this.isPublished) return;
    if (!this.projectId || !this.workflowId) return;

    this.aiWorking = true;
    this.aiError = '';
    this.aiSummary = '';
    this.message = '';
    this.errorMessage = '';

    this.workflowDesignerAi
      .sendCommand({
        projectId: this.projectId,
        workflowId: this.workflowId,
        prompt: this.aiPrompt,
        graph: this.graph,
        departments: this.departments ?? [],
      })
      .pipe(
        finalize(() => {
          this.aiWorking = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          this.workflowDesignerAi.applyAiGraphResponse(this.graph, response);

          this.clearSelection();
          this.resizeGraph();

          this.aiSummary = response.summary || 'Cambios aplicados con IA';
          this.message = this.aiSummary;
          this.errorMessage = '';
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error IA:', error);

          this.aiError =
            error?.error?.error ||
            error?.error?.message ||
            error?.message ||
            'No se pudo procesar el comando con IA';

          this.errorMessage = this.aiError;
          this.message = '';
          this.cdr.detectChanges();
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'workflows']);
  }
}
