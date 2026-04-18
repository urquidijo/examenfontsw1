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
import { finalize, timeout } from 'rxjs';
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowDiagram } from '../../models/workflow.model';

type NodeType = 'start' | 'task' | 'decision' | 'end';

type WorkflowNodeConfig = {
  label: string;
  nodeType: NodeType;
  assigneeId?: string;
  assigneeName?: string;
  requiresConfirmation: boolean;
  requiresAttachment: boolean;
  allowedFileTypes: string[];
  instructions: string;
  autoAdvance: boolean;
  formSchemaId?: string | null;
  inviteLink?: string;
  inviteToken?: string;
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
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  graph: any = null;

  projectId = '';
  loading = true;
  saving = false;
  creatingInvite = false;
  message = '';
  errorMessage = '';
  workflowId = '';

  selectedNode: any = null;

  nodeForm: WorkflowNodeConfig = this.createEmptyNodeConfig('task');

  fileTypeOptions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') || '';
    this.workflowId = this.route.snapshot.paramMap.get('workflowId') || '';
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    await this.initGraph();
    this.loadWorkflow();
  }

  ngOnDestroy(): void {
    this.graph?.dispose?.();
  }

  private async initGraph(): Promise<void> {
    const x6 = await import('@antv/x6');
    const Graph = x6.Graph;
    const Shape = x6.Shape;

    this.registerCustomNodes(Graph);

    this.graph = new Graph({
      container: this.containerRef.nativeElement,
      width: this.containerRef.nativeElement.clientWidth || 900,
      height: this.containerRef.nativeElement.clientHeight || 650,
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
        allowLoop: false,
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
          if (sourceCell.id === targetCell.id) return false;
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
      this.message = '';
      this.errorMessage = '';
      this.cdr.detectChanges();
    });

    this.graph.on('blank:click', () => {
      this.clearSelection();
    });

    if (this.graph.bindKey) {
      this.graph.bindKey(['backspace', 'delete'], () => {
        if (this.loading) {
          return false;
        }

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
  }

  private clearSelection(): void {
    this.selectedNode = null;
    this.nodeForm = this.createEmptyNodeConfig('task');
    this.cdr.detectChanges();
  }

  private createEmptyNodeConfig(nodeType: NodeType): WorkflowNodeConfig {
    return {
      label: '',
      nodeType,
      assigneeId: '',
      assigneeName: '',
      requiresConfirmation: false,
      requiresAttachment: false,
      allowedFileTypes: [],
      instructions: '',
      autoAdvance: false,
      formSchemaId: null,
      inviteLink: '',
      inviteToken: '',
    };
  }

  private getNodeTypeFromShape(shape: string): NodeType {
    if (shape === 'workflow-start') return 'start';
    if (shape === 'workflow-decision') return 'decision';
    if (shape === 'workflow-end') return 'end';
    return 'task';
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
        width: 160,
        height: 56,
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
        this.containerRef.nativeElement.clientWidth || 900,
        this.containerRef.nativeElement.clientHeight || 650,
      );
      this.graph?.centerContent?.();
    }, 0);
  }

  private loadWorkflow(): void {
    if (!this.graph) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.message = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.workflowService
      .getWorkflow(this.projectId, this.workflowId)
      .pipe(
        timeout(5000),
        finalize(() => {
          this.loading = false;
          this.resizeGraph();
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (diagram) => {
          this.graph.clearCells();

          if (diagram?.nodes?.length || diagram?.edges?.length) {
            this.graph.fromJSON({
              nodes: diagram.nodes as any,
              edges: diagram.edges as any,
            });
          }
        },
        error: (error) => {
          console.error('Error cargando workflow:', error);
          this.errorMessage = 'No se pudo cargar el flujo';
        },
      });
  }

  private getNodeLabel(node: any): string {
    return node?.attr?.('label/text') || node?.getAttrs?.()?.label?.text || '';
  }

  private buildNodePayload(nodeType: NodeType, label: string): WorkflowNodeConfig {
    return {
      ...this.createEmptyNodeConfig(nodeType),
      label,
    };
  }

  isFileTypeSelected(type: string): boolean {
    return this.nodeForm.allowedFileTypes.includes(type);
  }

  toggleFileType(type: string, checked: boolean): void {
    const current = new Set(this.nodeForm.allowedFileTypes);

    if (checked) {
      current.add(type);
    } else {
      current.delete(type);
    }

    this.nodeForm.allowedFileTypes = Array.from(current);
  }

  saveSelectedNodeConfig(): void {
    if (!this.selectedNode) {
      return;
    }

    const cleanLabel = this.nodeForm.label.trim() || 'Sin nombre';

    const payload: WorkflowNodeConfig = {
      ...this.nodeForm,
      label: cleanLabel,
      allowedFileTypes: this.nodeForm.requiresAttachment ? [...this.nodeForm.allowedFileTypes] : [],
    };

    this.selectedNode.attr('label/text', cleanLabel);
    this.selectedNode.setData(payload);

    this.nodeForm = { ...payload };

    this.message = 'Configuración del nodo actualizada';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  async copyInviteLink(): Promise<void> {
    if (!this.nodeForm.inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.nodeForm.inviteLink);
      this.message = 'Link copiado al portapapeles';
      this.errorMessage = '';
      this.cdr.detectChanges();
    } catch {
      this.errorMessage = 'No se pudo copiar el link';
      this.cdr.detectChanges();
    }
  }

  generateInviteLink(): void {
    if (!this.selectedNode) {
      return;
    }

    this.creatingInvite = true;
    this.message = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    const nodeId = this.selectedNode.id;

    this.workflowService
      .createNodeInviteLink(this.projectId, nodeId)
      .pipe(
        timeout(8000),
        finalize(() => {
          this.creatingInvite = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res: any) => {
          const payload: WorkflowNodeConfig = {
            ...this.nodeForm,
            inviteLink: res?.inviteLink || '',
            inviteToken: res?.token || '',
            assigneeId: res?.userId || this.nodeForm.assigneeId,
            assigneeName: res?.assigneeName || this.nodeForm.assigneeName,
          };

          this.nodeForm = payload;
          this.selectedNode.setData(payload);

          this.message = 'Link de invitación generado';
          this.errorMessage = '';
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error generando invitación:', error);
          this.errorMessage = 'No se pudo generar el link de invitación';
          this.cdr.detectChanges();
        },
      });
  }

  deleteSelectedNode(): void {
    if (!this.selectedNode || this.loading) {
      return;
    }

    this.graph.removeCell(this.selectedNode);
    this.selectedNode = null;
    this.nodeForm = this.createEmptyNodeConfig('task');
    this.message = 'Nodo eliminado';
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  addStartNode(): void {
    if (this.loading || !this.graph) return;

    this.graph.addNode({
      shape: 'workflow-start',
      x: 80,
      y: 80,
      label: 'Inicio',
      data: this.buildNodePayload('start', 'Inicio'),
    });
  }

  addTaskNode(): void {
    if (this.loading || !this.graph) return;

    this.graph.addNode({
      shape: 'workflow-task',
      x: 260,
      y: 80,
      label: 'Actividad',
      data: this.buildNodePayload('task', 'Actividad'),
    });
  }

  addDecisionNode(): void {
    if (this.loading || !this.graph) return;

    this.graph.addNode({
      shape: 'workflow-decision',
      x: 480,
      y: 80,
      label: 'Decisión',
      data: this.buildNodePayload('decision', 'Decisión'),
    });
  }

  addEndNode(): void {
    if (this.loading || !this.graph) return;

    this.graph.addNode({
      shape: 'workflow-end',
      x: 700,
      y: 80,
      label: 'Fin',
      data: this.buildNodePayload('end', 'Fin'),
    });
  }

  saveWorkflow(): void {
    if (this.loading || !this.graph) {
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

    this.workflowService.saveWorkflow(this.projectId, this.workflowId, payload);
  }

  goBack(): void {
    this.router.navigate(['/projects', this.projectId, 'workflows']);
  }
}
