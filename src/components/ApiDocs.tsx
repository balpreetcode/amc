import { useState } from 'react';
import './ApiDocs.css';

interface Section {
  id: string;
  title: string;
  anchor: string;
}

const SECTIONS: Section[] = [
  { id: 'auth', title: 'Authentication', anchor: 'authentication--authorization' },
  { id: 'workflow', title: 'Workflows', anchor: 'workflow-management' },
  { id: 'versioning', title: 'Versioning', anchor: 'workflow-versioning' },
  { id: 'execution', title: 'Execution', anchor: 'execution-management' },
  { id: 'nodes', title: 'Node Operations', anchor: 'node-operations' },
  { id: 'templates', title: 'Templates', anchor: 'template-management-existing' },
  { id: 'errors', title: 'Errors', anchor: 'error-responses' },
  { id: 'env', title: 'Environment', anchor: 'environment-variables' },
  { id: 'examples', title: 'Examples', anchor: 'example-usage' },
];

export function ApiDocs() {
  const [activeSection, setActiveSection] = useState('');

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = e.currentTarget.getAttribute('href');
    if (target) {
      const element = document.querySelector(target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(target.substring(1));
      }
    }
  };

  return (
    <div className="api-docs">
      <aside className="docs-sidebar">
        <div className="sidebar-header">
          <h3>API Docs</h3>
        </div>
        <nav className="docs-nav">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.anchor}`}
              className={`nav-item ${activeSection === section.anchor ? 'active' : ''}`}
              onClick={handleClick}
            >
              {section.title}
            </a>
          ))}
        </nav>
      </aside>

      <main className="docs-content">
        <div className="docs-header">
          <h1>API Documentation</h1>
          <p className="docs-subtitle">Complete API reference for the AI Video Workflow Builder backend</p>
        </div>

        {/* Authentication Section */}
        <section id="authentication--authorization" className="doc-section">
          <h2>Authentication & Authorization</h2>

          <h3>Authentication Methods</h3>
          <p>The API supports two authentication methods:</p>

          <div className="info-box">
            <p><strong>1. JWT Tokens</strong> (recommended for web apps)</p>
            <code>Header: Authorization: Bearer &lt;access_token&gt;</code>
            <p>Full access to all endpoints</p>
          </div>

          <div className="info-box">
            <p><strong>2. API Keys</strong> (recommended for integrations)</p>
            <code>Header: x-api-key: &lt;api_key&gt;</code>
            <p>Scoped access based on key permissions</p>
          </div>

          <h4>Scopes</h4>
          <p>API keys can have the following scopes:</p>
          <ul className="tag-list">
            <li><code>read</code> - Read access to workflows and executions</li>
            <li><code>write</code> - Create and update workflows</li>
            <li><code>execute</code> - Execute workflows</li>
            <li><code>admin</code> - Full administrative access</li>
          </ul>

          <EndpointCard
            method="POST"
            path="/auth/register"
            title="Register a new user account"
            requestBody={{
              email: 'user@example.com',
              password: 'securepassword123',
              name: 'John Doe',
            }}
            responseCode="201"
            response={{
              user: {
                id: 'uuid',
                email: 'user@example.com',
                name: 'John Doe',
                role: 'user',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
              accessToken: 'eyJhbGciOiJIUzI1NiIs...',
              refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
            }}
            errors={['400 - Invalid email format or password too short', '409 - User with this email already exists']}
          />

          <EndpointCard
            method="POST"
            path="/auth/login"
            title="Login with email and password"
            requestBody={{
              email: 'user@example.com',
              password: 'securepassword123',
            }}
            responseCode="200"
            response={{
              user: {
                id: 'uuid',
                email: 'user@example.com',
                name: 'John Doe',
                role: 'user',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
              accessToken: 'eyJhbGciOiJIUzI1NiIs...',
              refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
            }}
            errors={['400 - Email and password required', '401 - Invalid email or password']}
          />

          <EndpointCard
            method="POST"
            path="/auth/logout"
            title="Logout and invalidate refresh token"
            requestBody={{
              refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
            }}
            responseCode="200"
            response={{
              message: 'Logged out successfully',
            }}
          />

          <EndpointCard
            method="POST"
            path="/auth/refresh"
            title="Refresh access token using refresh token"
            requestBody={{
              refreshToken: 'eyJhbGciOiJIUzI1NiIs...',
            }}
            responseCode="200"
            response={{
              accessToken: 'eyJhbGciOiJIUzI1NiIs...',
            }}
            errors={['400 - Refresh token required', '401 - Invalid or expired refresh token']}
          />

          <EndpointCard
            method="GET"
            path="/auth/me"
            title="Get current user information"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              user: {
                id: 'uuid',
                email: 'user@example.com',
                name: 'John Doe',
                role: 'user',
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
            }}
          />

          <EndpointCard
            method="POST"
            path="/auth/api-keys"
            title="Create a new API key"
            requestHeader="Authorization: Bearer <access_token>"
            requestBody={{
              name: 'Production API Key',
              scopes: ['read', 'write', 'execute'],
            }}
            responseCode="200"
            response={{
              id: 'uuid',
              userId: 'uuid',
              name: 'Production API Key',
              key: 'abc123...',
              scopes: ['read', 'write', 'execute'],
              createdAt: '2024-01-01T00:00:00.000Z',
              lastUsed: null,
              expiresAt: null,
            }}
            note="The `key` field is only returned on creation. Store it securely!"
          />

          <EndpointCard
            method="GET"
            path="/auth/api-keys"
            title="List all API keys for the current user"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={[
              {
                id: 'uuid',
                userId: 'uuid',
                name: 'Production API Key',
                scopes: ['read', 'write', 'execute'],
                createdAt: '2024-01-01T00:00:00.000Z',
                lastUsed: '2024-01-02T00:00:00.000Z',
                expiresAt: null,
              },
            ]}
          />

          <EndpointCard
            method="DELETE"
            path="/auth/api-keys/:id"
            title="Delete an API key"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              message: 'API key deleted successfully',
            }}
            errors={['404 - API key not found']}
          />
        </section>

        {/* Workflow Management Section */}
        <section id="workflow-management" className="doc-section">
          <h2>Workflow Management</h2>

          <EndpointCard
            method="GET"
            path="/workflows"
            title="List workflows for the current user with filtering, sorting, and pagination"
            requestHeader="Authorization: Bearer <access_token>"
            queryParams={[
              { name: 'search', desc: 'Search by name or description' },
              { name: 'tags', desc: 'Comma-separated list of tags' },
              { name: 'sortBy', desc: 'Sort field (name, createdAt, updatedAt)' },
              { name: 'sortOrder', desc: 'Sort order (asc, desc)' },
              { name: 'page', desc: 'Page number (default: 1)' },
              { name: 'limit', desc: 'Items per page (default: 20)' },
            ]}
            responseCode="200"
            response={{
              workflows: [
                {
                  id: 'uuid',
                  name: 'AI Video Generator',
                  description: 'Generate videos from text prompts',
                  nodes: ['...'],
                  userId: 'uuid',
                  tags: ['ai', 'video'],
                  version: 3,
                  createdAt: '2024-01-01T00:00:00.000Z',
                  updatedAt: '2024-01-02T00:00:00.000Z',
                  nodeCount: 5,
                },
              ],
              total: 42,
              page: 1,
              limit: 10,
              totalPages: 5,
            }}
          />

          <EndpointCard
            method="POST"
            path="/workflows"
            title="Create a new workflow"
            requestHeader="Authorization: Bearer <access_token>"
            requestBody={{
              name: 'My New Workflow',
              description: 'Description of the workflow',
              nodes: [
                {
                  id: 'node-1',
                  type: 'text_to_text',
                  config: {
                    prompt: 'Write a story about...',
                    model: 'gpt-4o-mini',
                  },
                },
              ],
              tags: ['ai', 'text'],
            }}
            responseCode="200"
            response={{
              id: 'uuid',
              name: 'My New Workflow',
              description: 'Description of the workflow',
              nodes: ['...'],
              userId: 'uuid',
              tags: ['ai', 'text'],
              version: 1,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
              nodeCount: 1,
            }}
            errors={['400 - Name and nodes are required']}
          />

          <EndpointCard
            method="GET"
            path="/workflows/:id"
            title="Get a specific workflow by ID"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              id: 'uuid',
              name: 'My Workflow',
              description: 'Description',
              nodes: ['...'],
              userId: 'uuid',
              tags: ['ai'],
              version: 2,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-02T00:00:00.000Z',
              nodeCount: 5,
            }}
            errors={['403 - Access denied (not owner)', '404 - Workflow not found']}
          />

          <EndpointCard
            method="PUT"
            path="/workflows/:id"
            title="Update a workflow"
            requestHeader="Authorization: Bearer <access_token>"
            requestBody={{
              name: 'Updated Name',
              description: 'Updated description',
              nodes: ['...'],
              tags: ['updated', 'tags'],
            }}
            responseCode="200"
            response={{
              id: 'uuid',
              name: 'Updated Name',
              description: 'Updated description',
              nodes: ['...'],
              userId: 'uuid',
              tags: ['updated', 'tags'],
              version: 3,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-03T00:00:00.000Z',
              nodeCount: 5,
            }}
            note="Updating nodes increments the version number and creates a new version snapshot."
            errors={['403 - Access denied (not owner)', '404 - Workflow not found']}
          />

          <EndpointCard
            method="DELETE"
            path="/workflows/:id"
            title="Delete a workflow"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              message: 'Workflow deleted successfully',
            }}
            errors={['403 - Access denied (not owner)', '404 - Workflow not found']}
          />

          <EndpointCard
            method="POST"
            path="/workflows/:id/clone"
            title="Clone a workflow"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              id: 'new-uuid',
              name: 'My Workflow (Copy)',
              description: 'Description',
              nodes: ['...'],
              userId: 'uuid',
              tags: ['ai'],
              version: 1,
              createdAt: '2024-01-03T00:00:00.000Z',
              updatedAt: '2024-01-03T00:00:00.000Z',
              nodeCount: 5,
            }}
            errors={['403 - Access denied (not owner)', '404 - Workflow not found']}
          />
        </section>

        {/* Workflow Versioning Section */}
        <section id="workflow-versioning" className="doc-section">
          <h2>Workflow Versioning</h2>

          <EndpointCard
            method="GET"
            path="/workflows/:id/versions"
            title="List all versions of a workflow"
            requestHeader="Authorization: Bearer <access_token>"
            queryParams={[
              { name: 'page', desc: 'Page number (default: 1)' },
              { name: 'limit', desc: 'Items per page (default: 20)' },
            ]}
            responseCode="200"
            response={{
              versions: [
                {
                  id: 'uuid',
                  workflowId: 'uuid',
                  versionNumber: 3,
                  snapshot: {
                    name: 'Workflow Name',
                    description: 'Description',
                    nodes: ['...'],
                    tags: ['ai'],
                  },
                  changeNote: 'Added new nodes',
                  createdAt: '2024-01-03T00:00:00.000Z',
                },
              ],
              total: 3,
              page: 1,
              limit: 20,
              totalPages: 1,
            }}
            errors={['403 - Access denied (not owner)', '404 - Workflow not found']}
          />

          <EndpointCard
            method="POST"
            path="/workflows/:id/versions"
            title="Create a new version snapshot of the current workflow state"
            requestHeader="Authorization: Bearer <access_token>"
            requestBody={{
              changeNote: 'Added image generation node',
            }}
            responseCode="200"
            response={{
              id: 'uuid',
              workflowId: 'uuid',
              versionNumber: 4,
              snapshot: {
                name: 'Workflow Name',
                description: 'Description',
                nodes: ['...'],
                tags: ['ai'],
              },
              changeNote: 'Added image generation node',
              createdAt: '2024-01-03T00:00:00.000Z',
            }}
          />

          <EndpointCard
            method="GET"
            path="/workflows/:id/versions/:version"
            title="Get a specific version by version number"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              id: 'uuid',
              workflowId: 'uuid',
              versionNumber: 2,
              snapshot: {
                name: 'Workflow Name',
                description: 'Description',
                nodes: ['...'],
                tags: ['ai'],
              },
              changeNote: 'Initial version',
              createdAt: '2024-01-01T00:00:00.000Z',
            }}
            errors={['403 - Access denied (not owner)', '404 - Version not found']}
          />

          <EndpointCard
            method="POST"
            path="/workflows/:id/versions/:version/restore"
            title="Restore workflow to a specific version"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              id: 'uuid',
              name: 'Workflow Name',
              description: 'Description',
              nodes: ['...'],
              userId: 'uuid',
              tags: ['ai'],
              version: 5,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-03T00:00:00.000Z',
              nodeCount: 3,
            }}
            note="Restoring creates a new version with the note 'Restored from version X'."
          />
        </section>

        {/* Execution Management Section */}
        <section id="execution-management" className="doc-section">
          <h2>Execution Management</h2>

          <EndpointCard
            method="GET"
            path="/executions"
            title="List executions with filtering and pagination"
            requestHeader="Authorization: Bearer <access_token>"
            queryParams={[
              { name: 'workflowId', desc: 'Filter by workflow ID' },
              { name: 'status', desc: 'Filter by status (pending, running, completed, failed, paused)' },
              { name: 'page', desc: 'Page number (default: 1)' },
              { name: 'limit', desc: 'Items per page (default: 20)' },
            ]}
            responseCode="200"
            response={{
              executions: [
                {
                  id: 'uuid',
                  workflowId: 'uuid',
                  conductorWorkflowId: 'conductor-uuid',
                  userId: 'uuid',
                  status: 'completed',
                  startedAt: '2024-01-01T00:00:00.000Z',
                  completedAt: '2024-01-01T00:05:00.000Z',
                  nodes: ['...'],
                  error: null,
                },
              ],
              total: 15,
              page: 1,
              limit: 10,
              totalPages: 2,
            }}
          />

          <EndpointCard
            method="GET"
            path="/executions/:id"
            title="Get execution details with live status from Conductor"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              id: 'uuid',
              workflowId: 'uuid',
              conductorWorkflowId: 'conductor-uuid',
              userId: 'uuid',
              status: 'running',
              startedAt: '2024-01-01T00:00:00.000Z',
              completedAt: null,
              nodes: [],
              error: null,
              conductorData: {
                status: 'RUNNING',
                tasks: ['...'],
              },
            }}
            errors={['403 - Access denied (not owner)', '404 - Execution not found']}
          />

          <EndpointCard
            method="GET"
            path="/executions/:id/nodes"
            title="Get execution nodes/tasks with detailed status"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              nodes: [
                {
                  nodeId: 'node-1',
                  nodeType: 'text_to_text',
                  taskId: 'task-uuid',
                  status: 'completed',
                  startTime: '2024-01-01T00:00:00.000Z',
                  endTime: '2024-01-01T00:00:30.000Z',
                  output: {
                    text: 'Generated text...',
                    model: 'gpt-4o-mini',
                  },
                  error: null,
                },
              ],
            }}
            errors={['403 - Access denied (not owner)', '404 - Execution not found']}
          />

          <EndpointCard
            method="GET"
            path="/executions/:id/logs"
            title="Get execution logs"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              logs: [
                '[2024-01-01T00:00:00.000Z] [INFO] Workflow started',
                '[2024-01-01T00:00:05.000Z] [INFO] Node node-1 completed',
                '[2024-01-01T00:00:10.000Z] [INFO] Node node-2 started',
              ],
            }}
            errors={['403 - Access denied (not owner)', '404 - Execution not found']}
          />

          <EndpointCard
            method="POST"
            path="/executions/:id/retry"
            title="Retry a failed execution"
            requestHeader="Authorization: Bearer <access_token>"
            responseCode="200"
            response={{
              message: 'Execution retry initiated',
            }}
            errors={['403 - Access denied (not owner)', '404 - Execution not found']}
          />
        </section>

        {/* Node Operations Section */}
        <section id="node-operations" className="doc-section">
          <h2>Node Operations</h2>

          <EndpointCard
            method="POST"
            path="/nodes/:taskId/rerun"
            title="Rerun a specific node/task in an execution"
            requestHeader="Authorization: Bearer <access_token>"
            requestBody={{
              executionId: 'uuid',
            }}
            responseCode="200"
            response={{
              message: 'Task rerun initiated',
              taskId: 'task-uuid',
              taskReferenceName: 'node_1',
            }}
            errors={[
              '400 - Execution ID required',
              '403 - Access denied (not owner)',
              '404 - Task or execution not found',
            ]}
          />
        </section>

        {/* Template Management Section */}
        <section id="template-management-existing" className="doc-section">
          <h2>Template Management</h2>
          <p>These endpoints existed before and remain unchanged:</p>

          <EndpointCard method="GET" path="/templates" title="List all templates" />
          <EndpointCard method="GET" path="/template/:id" title="Get a specific template" />
          <EndpointCard method="POST" path="/template" title="Create a new template" />
          <EndpointCard method="PUT" path="/template/:id" title="Update a template" />
          <EndpointCard method="DELETE" path="/template/:id" title="Delete a template" />
          <EndpointCard
            method="POST"
            path="/template/:id/generate"
            title="Generate a video from a template"
          />
        </section>

        {/* Error Responses Section */}
        <section id="error-responses" className="doc-section">
          <h2>Error Responses</h2>
          <p>All endpoints return errors in the following format:</p>

          <div className="code-block">
            <pre>{`{
  "error": "Error message description"
}`}</pre>
          </div>

          <p>Common HTTP status codes:</p>
          <ul className="tag-list">
            <li><code>400</code> - Bad Request (invalid input)</li>
            <li><code>401</code> - Unauthorized (missing or invalid authentication)</li>
            <li><code>403</code> - Forbidden (insufficient permissions)</li>
            <li><code>404</code> - Not Found</li>
            <li><code>409</code> - Conflict (duplicate resource)</li>
            <li><code>500</code> - Internal Server Error</li>
          </ul>
        </section>

        {/* Environment Variables Section */}
        <section id="environment-variables" className="doc-section">
          <h2>Environment Variables</h2>
          <p>Add these to your <code>.env</code> file:</p>

          <div className="code-block">
            <pre>{`# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Conductor Configuration
CONDUCTOR_URL=https://p5300.winds-os.com/api

# Server Configuration
PORT=8080`}</pre>
          </div>
        </section>

        {/* Example Usage Section */}
        <section id="example-usage" className="doc-section">
          <h2>Example Usage</h2>

          <h3>Register and Login</h3>
          <div className="code-block">
            <pre>{'# Register\ncurl -X POST http://localhost:8080/auth_register \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "email": "user@example.com",\n    "password": "securepass",\n    "name": "John Doe"\n  }\'\n\n# Login\ncurl -X POST http://localhost:8080/auth/login \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "email": "user@example.com",\n    "password": "securepass"\n  }\''}</pre>
          </div>

          <h3>Create Workflow</h3>
          <div className="code-block">
            <pre>{'curl -X POST http://localhost:8080/workflows \\\n  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "name": "Text to Video",\n    "description": "Generate video from text",\n    "nodes": [\n      {\n        "id": "node-1",\n        "type": "text_to_text",\n        "config": {"prompt": "Write a story"}\n      },\n      {\n        "id": "node-2",\n        "type": "text_to_video",\n        "config": {"prompt": "${node-1.output.text}"}\n      }\n    ],\n    "tags": ["ai", "video"]\n  }\''}</pre>
          </div>

          <h3>Create API Key</h3>
          <div className="code-block">
            <pre>{'curl -X POST http://localhost:8080/auth/api-keys \\\n  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "name": "Production Key",\n    "scopes": ["read", "write", "execute"]\n  }\''}</pre>
          </div>

          <h3>Use API Key</h3>
          <div className="code-block">
            <pre>{'curl -X GET http://localhost:8080/workflows \\\n  -H "x-api-key: YOUR_API_KEY"'}</pre>
          </div>
        </section>

        <div className="docs-footer">
          <p>
            <strong>Rate Limiting:</strong> Currently not implemented. Consider adding rate limiting
            in production.
          </p>
          <p>
            <strong>CORS:</strong> CORS is enabled for all origins. Configure appropriately for
            production.
          </p>
        </div>
      </main>
    </div>
  );
}

interface EndpointCardProps {
  method: string;
  path: string;
  title: string;
  requestHeader?: string;
  requestBody?: Record<string, unknown> | unknown[];
  queryParams?: Array<{ name: string; desc: string }>;
  responseCode?: string;
  response?: Record<string, unknown> | unknown[];
  note?: string;
  errors?: string[];
}

function EndpointCard({
  method,
  path,
  title,
  requestHeader,
  requestBody,
  queryParams,
  responseCode,
  response,
  note,
  errors,
}: EndpointCardProps) {
  return (
    <div className="endpoint-card">
      <div className="endpoint-header">
        <span className={`method method-${method.toLowerCase()}`}>{method}</span>
        <code className="endpoint-path">{path}</code>
      </div>
      <p className="endpoint-title">{title}</p>

      {requestHeader && (
        <div className="endpoint-section">
          <h4>Request Headers</h4>
          <div className="code-block">
            <pre>{requestHeader}</pre>
          </div>
        </div>
      )}

      {queryParams && queryParams.length > 0 && (
        <div className="endpoint-section">
          <h4>Query Parameters</h4>
          <table className="params-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {queryParams.map((param, i) => (
                <tr key={i}>
                  <td>
                    <code>{param.name}</code>
                  </td>
                  <td>{param.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {requestBody && (
        <div className="endpoint-section">
          <h4>Request Body</h4>
          <div className="code-block">
            <pre>{JSON.stringify(requestBody, null, 2)}</pre>
          </div>
        </div>
      )}

      {responseCode && response && (
        <div className="endpoint-section">
          <h4>
            Response ({responseCode})
          </h4>
          <div className="code-block">
            <pre>{JSON.stringify(response, null, 2)}</pre>
          </div>
        </div>
      )}

      {note && (
        <div className="endpoint-note">
          <strong>Note:</strong> {note}
        </div>
      )}

      {errors && errors.length > 0 && (
        <div className="endpoint-section">
          <h4>Errors</h4>
          <ul className="errors-list">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
