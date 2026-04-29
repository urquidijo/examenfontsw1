export interface FormAiFieldDefinition {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormAiFillRequest {
  transcript: string;
  currentDate: string;
  taskTitle?: string;
  ticketTitle?: string;
  ticketDescription?: string;
  clientName?: string;
  fields: FormAiFieldDefinition[];
}

export interface FormAiFillResponse {
  summary: string;
  values: Record<string, any>;
}