// Authentication Types

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsed: string | null;
  expiresAt: string | null;
  key?: string; // Only returned on creation
}

// Workflow Types

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  userId: string;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
}

export interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, any>;
  execution?: {
    mode: 'parallel' | 'sequential';
    waitForAll: boolean;
    aggregateItems: boolean;
  };
}

export interface WorkflowListResponse {
  workflows: Workflow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  tags?: string[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  tags?: string[];
}

// Workflow Versioning Types

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  versionNumber: number;
  snapshot: {
    name: string;
    description: string;
    nodes: WorkflowNode[];
    tags: string[];
  };
  changeNote: string;
  createdAt: string;
}

export interface VersionListResponse {
  versions: WorkflowVersion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateVersionRequest {
  changeNote?: string;
}

// Execution Types

export interface Execution {
  id: string;
  workflowId: string;
  conductorWorkflowId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  completedAt: string | null;
  nodes: ExecutionNode[];
  error: string | null;
}

export interface ExecutionNode {
  nodeId: string;
  nodeType: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: string | null;
  endTime: string | null;
  output: any;
  error: string | null;
}

export interface ExecutionListResponse {
  executions: Execution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExecutionDetailsResponse extends Execution {
  conductorData?: {
    status: string;
    tasks: any[];
  };
}

export interface ExecutionNodesResponse {
  nodes: ExecutionNode[];
}

export interface ExecutionLogsResponse {
  logs: string[];
}

// API Request/Response Types

export interface ApiError {
  error: string;
  suggestion?: string;
}

export interface ApiSuccess {
  message: string;
}

// Workflow Execution (existing endpoint)
export interface WorkflowRunRequest {
  nodes: WorkflowNode[];
  workflowName?: string;
}

export interface WorkflowRunResponse {
  success: boolean;
  workflowId: string;
  message: string;
}

// Filter/Query Types

export interface WorkflowFilters {
  search?: string;
  tags?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ExecutionFilters {
  workflowId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  page?: number;
  limit?: number;
}

export interface VersionFilters {
  page?: number;
  limit?: number;
}
