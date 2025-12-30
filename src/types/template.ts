import type { WorkflowNodeData } from './nodes';

export interface Template {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  lastModified: string;
  videoPreview: string;
  nodes: WorkflowNodeData[];
  nodeCount: number;
  templateVersion: number;
}

export interface TemplateCreateRequest {
  name: string;
  description?: string;
  nodes: WorkflowNodeData[];
  videoPreview?: string;
}

export interface TemplateUpdateRequest {
  name?: string;
  description?: string;
  nodes?: WorkflowNodeData[];
  videoPreview?: string;
}
