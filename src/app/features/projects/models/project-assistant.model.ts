export type ProjectAssistantActionKey =
  | 'users'
  | 'tramites'
  | 'departments'
  | 'workflows'
  | 'tickets'
  | 'tasks'
  | 'kpis';

export interface ProjectAssistantAction {
  label: string;
  action: ProjectAssistantActionKey;
}

export interface ProjectAssistantMessage {
  sender: 'user' | 'assistant';
  text: string;
}

export interface ProjectAssistantChatRequest {
  message: string;
  projectName?: string;
  currentModule?: string;
  history?: ProjectAssistantMessage[];
}

export interface ProjectAssistantChatResponse {
  answer: string;
  actions: ProjectAssistantAction[];
  suggestions: string[];
}