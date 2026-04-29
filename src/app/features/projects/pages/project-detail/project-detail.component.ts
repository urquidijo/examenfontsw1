import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { ProjectKpiService } from '../../services/project-kpi.service';
import { Project } from '../../models/project.model';
import { ProjectKpiResponse } from '../../models/project-kpi.model';
import { ProjectAssistantService } from '../../services/project-assistant.service';
import {
  ProjectAssistantAction,
  ProjectAssistantActionKey,
  ProjectAssistantMessage,
  ProjectAssistantChatResponse,
} from '../../models/project-assistant.model';

type ProjectAssistantUiMessage = ProjectAssistantMessage & {
  id: number;
  actions?: ProjectAssistantAction[];
};

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './project-detail.component.html',
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private cdr = inject(ChangeDetectorRef);
  private projectAssistantService = inject(ProjectAssistantService);

  

  projectId = '';
  project: Project | null = null;

  loading = true;
  errorMessage = '';

  kpi: ProjectKpiResponse | null = null;
  loadingKpis = false;
  kpiErrorMessage = '';

  thresholdTickets = 10;
  thresholdDays = 2;

  assistantOpen = false;
assistantInput = '';
assistantThinking = false;

assistantSuggestions: string[] = [
  'No sé qué hacer',
  'Cómo creo un workflow',
  'Cómo creo un ticket',
  'Cómo reviso cuellos de botella',
];

assistantMessages: ProjectAssistantUiMessage[] = [
  {
    id: Date.now(),
    sender: 'assistant',
    text:
      'Hola, soy tu asistente IA de NexaFlow. Puedes preguntarme cómo usar usuarios, trámites, departamentos, workflows, tickets, tareas o KPI.',
    actions: [
      { label: 'Qué hago primero', action: 'users' },
      { label: 'Ver workflows', action: 'workflows' },
      { label: 'Ver KPI', action: 'kpis' },
    ],
  },
];

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    this.loadProject();
  }

  loadProject(): void {
    if (!this.projectId) {
      this.loading = false;
      this.errorMessage = 'Proyecto no encontrado';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.projectService.getProjectById(this.projectId).subscribe({
      next: (project) => {
        this.project = project;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'No se pudo cargar el proyecto';
        this.cdr.detectChanges();
      },
    });
  }

  
  get hasBottlenecks(): boolean {
    return !!this.kpi && this.kpi.totalBottleneckDepartments > 0;
  }

  get bottleneckDepartments() {
    return this.kpi?.departments?.filter((department) => department.bottleneck) ?? [];
  }

  get normalDepartments() {
    return this.kpi?.departments?.filter((department) => !department.bottleneck) ?? [];
  }

  formatHoursToDays(hours: number): string {
    const days = Number(hours || 0) / 24;
    return `${Math.round(days * 10) / 10} días`;
  }

  getSeverityLabel(severity: string): string {
    if (severity === 'HIGH') return 'Alta';
    if (severity === 'MEDIUM') return 'Media';
    return 'Baja';
  }

  getSeverityClass(severity: string): string {
    if (severity === 'HIGH') {
      return 'bg-red-100 text-red-700 border-red-200';
    }

    if (severity === 'MEDIUM') {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }

    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }

  openKpis(): void {
  this.router.navigate(['/projects', this.projectId, 'kpis']);
}

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  openWorkflows(): void {
    this.router.navigate(['/projects', this.projectId, 'workflows']);
  }

  openUsers(): void {
    this.router.navigate(['/projects', this.projectId, 'users']);
  }

  openDepartments(): void {
    this.router.navigate(['/projects', this.projectId, 'departments']);
  }

  openCases(): void {
    this.router.navigate(['/projects', this.projectId, 'tramites']);
  }

  openTickets(): void {
    this.router.navigate(['/projects', this.projectId, 'tickets']);
  }

  openTasks(): void {
    this.router.navigate(['/projects', this.projectId, 'tasks']);
  }
  toggleAssistant(): void {
  this.assistantOpen = !this.assistantOpen;
  this.cdr.detectChanges();
}

closeAssistant(): void {
  this.assistantOpen = false;
  this.cdr.detectChanges();
}

sendAssistantMessage(): void {
  const question = this.assistantInput.trim();

  if (!question || this.assistantThinking || !this.projectId) return;

  this.assistantMessages.push({
    id: Date.now(),
    sender: 'user',
    text: question,
  });

  this.assistantInput = '';
  this.assistantThinking = true;
  this.cdr.detectChanges();

  const history = this.assistantMessages.slice(-8).map((message) => ({
    sender: message.sender,
    text: message.text,
  }));

  this.projectAssistantService
    .chat(this.projectId, {
      message: question,
      projectName: this.project?.name || '',
      currentModule: 'project-detail',
      history,
    })
    .subscribe({
      next: (response) => {
        this.assistantMessages.push({
          id: Date.now() + 1,
          sender: 'assistant',
          text: response.answer || 'Puedo ayudarte a usar el proyecto.',
          actions: response.actions || [],
        });

        if (response.suggestions?.length) {
          this.assistantSuggestions = response.suggestions;
        }

        this.assistantThinking = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.assistantMessages.push({
          id: Date.now() + 1,
          sender: 'assistant',
          text:
            'No pude conectarme con la IA en este momento, pero puedo orientarte: revisa usuarios, trámites, departamentos, workflows, tickets, tareas y KPI según lo que necesites hacer.',
          actions: [
            { label: 'Usuarios', action: 'users' },
            { label: 'Workflows', action: 'workflows' },
            { label: 'KPI', action: 'kpis' },
          ],
        });

        this.assistantThinking = false;
        this.cdr.detectChanges();
      },
    });
}

askAssistant(question: string): void {
  if (this.assistantThinking) return;

  this.assistantInput = question;
  this.sendAssistantMessage();
}

clearAssistantChat(): void {
  this.assistantMessages = [
    {
      id: Date.now(),
      sender: 'assistant',
      text: 'Listo, empecemos de nuevo. Pregúntame qué necesitas hacer dentro del proyecto.',
      actions: [
        { label: 'Qué hago primero', action: 'users' },
        { label: 'Ver workflows', action: 'workflows' },
        { label: 'Ver KPI', action: 'kpis' },
      ],
    },
  ];

  this.assistantSuggestions = [
    'No sé qué hacer',
    'Cómo creo un workflow',
    'Cómo creo un ticket',
    'Cómo reviso cuellos de botella',
  ];

  this.cdr.detectChanges();
}

runAssistantAction(action: ProjectAssistantActionKey): void {
  if (action === 'users') {
    this.openUsers();
    return;
  }

  if (action === 'tramites') {
    this.openCases();
    return;
  }

  if (action === 'departments') {
    this.openDepartments();
    return;
  }

  if (action === 'workflows') {
    this.openWorkflows();
    return;
  }

  if (action === 'tickets') {
    this.openTickets();
    return;
  }

  if (action === 'tasks') {
    this.openTasks();
    return;
  }

  if (action === 'kpis') {
    this.openKpis();
  }
}
}