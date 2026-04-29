export interface DepartmentKpi {
  departmentId: string;
  departmentName: string;

  activeTickets: number;
  uniqueTickets: number;
  delayedTickets: number;

  averageAgeHours: number;
  oldestTicketAgeHours: number;

  thresholdTickets: number;
  thresholdDays: number;

  bottleneck: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  message: string;
}

export interface ProjectKpiResponse {
  projectId: string;
  generatedAt: string;

  totalActiveTickets: number;
  totalDelayedTickets: number;
  totalBottleneckDepartments: number;

  thresholdTickets: number;
  thresholdDays: number;

  departments: DepartmentKpi[];
}
export interface ProjectKpiSettings {
  id: string;
  projectId: string;
  thresholdTickets: number;
  thresholdDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectKpiSettingsRequest {
  thresholdTickets: number;
  thresholdDays: number;
}