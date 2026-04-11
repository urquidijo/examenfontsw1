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
import { finalize, timeout } from 'rxjs';
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowDiagram } from '../../models/workflow.model';

@Component({
  selector: 'app-workflow-designer',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
  message = '';
  errorMessage = '';

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
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
        validateConnection({ sourceCell, targetCell }: any) {
          return !!sourceCell && !!targetCell && sourceCell.id !== targetCell.id;
        },
      },
      interacting: {
        edgeLabelMovable: false,
      },
    });

    if (this.graph.enableSelection) {
      this.graph.enableSelection();
    }

    if (this.graph.bindKey) {
      this.graph.bindKey(['backspace', 'delete'], () => {
        if (this.loading) {
          return false;
        }

        const cells = this.graph.getSelectedCells?.() || [];
        if (cells.length) {
          this.graph.removeCells(cells);
        }
        return false;
      });
    }
  }

  private registerCustomNodes(Graph: any): void {
    Graph.registerNode(
      'workflow-start',
      {
        inherit: 'rect',
        width: 140,
        height: 48,
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
      .getWorkflow(this.projectId)
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
          console.log('workflow cargado:', diagram);

          this.graph.clearCells();

          if (diagram?.nodes?.length || diagram?.edges?.length) {
            this.graph.fromJSON({
              nodes: diagram.nodes as any,
              edges: diagram.edges as any,
            });
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error cargando workflow:', error);
          this.errorMessage = 'No se pudo cargar el flujo';
          this.cdr.detectChanges();
        },
      });
  }
  addStartNode(): void {
    if (this.loading || !this.graph) return;

    this.graph.addNode({
      shape: 'workflow-start',
      x: 80,
      y: 80,
      label: 'Inicio',
    });
  }

  addTaskNode(): void {
    if (this.loading || !this.graph) return;

    this.graph.addNode({
      shape: 'workflow-task',
      x: 260,
      y: 80,
      label: 'Actividad',
    });
  }

  addDecisionNode(): void {
    if (this.loading || !this.graph) return;

    this.graph.addNode({
      shape: 'workflow-decision',
      x: 480,
      y: 80,
      label: 'Decisión',
    });
  }

  addEndNode(): void {
    if (this.loading || !this.graph) return;

    this.graph.addNode({
      shape: 'workflow-end',
      x: 700,
      y: 80,
      label: 'Fin',
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

    const payload: WorkflowDiagram = {
      projectId: this.projectId,
      nodes: cells.filter((c) => !c.source) as any,
      edges: cells.filter((c) => !!c.source && !!c.target) as any,
    };

    this.workflowService
      .saveWorkflow(this.projectId, payload)
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
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error guardando workflow:', error);
          this.errorMessage = 'No se pudo guardar el flujo';
          this.cdr.detectChanges();
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
