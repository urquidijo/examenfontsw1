export type TramiteFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'SELECT'
  | 'CHECKBOX'
  | 'FILE';

export interface TramiteField {
  id: string;
  label: string;
  type: TramiteFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface TramiteTemplate {
  id: string;
  projectId: string;
  name: string;
  description: string;
  active: boolean;
  fieldsCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  fields: TramiteField[];
}

export interface CreateTramiteRequest {
  name: string;
  description?: string;
  active?: boolean;
  fields: TramiteField[];
}

export interface UpdateTramiteRequest {
  name?: string;
  description?: string;
  active?: boolean;
  fields?: TramiteField[];
}