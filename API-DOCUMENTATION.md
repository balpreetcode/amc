# API Documentation

Complete API reference for the AI Video Workflow Builder backend.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Workflow Management](#workflow-management)
3. [Workflow Versioning](#workflow-versioning)
4. [Execution Management](#execution-management)
5. [Node Operations](#node-operations)
6. [Template Management](#template-management-existing)

---

## Authentication & Authorization

### Authentication Methods

The API supports two authentication methods:

1. **JWT Tokens** (recommended for web apps)
   - Header: `Authorization: Bearer <access_token>`
   - Full access to all endpoints

2. **API Keys** (recommended for integrations)
   - Header: `x-api-key: <api_key>`
   - Scoped access based on key permissions

### Scopes

API keys can have the following scopes:
- `read` - Read access to workflows and executions
- `write` - Create and update workflows
- `execute` - Execute workflows
- `admin` - Full administrative access

---

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `400` - Invalid email format or password too short
- `409` - User with this email already exists

---

### POST /auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `400` - Email and password required
- `401` - Invalid email or password

---

### POST /auth/logout

Logout and invalidate refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Errors:**
- `400` - Refresh token required
- `401` - Invalid or expired refresh token

---

### GET /auth/me

Get current user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### POST /auth/api-keys

Create a new API key.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Production API Key",
  "scopes": ["read", "write", "execute"]
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Production API Key",
  "key": "abc123...",
  "scopes": ["read", "write", "execute"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastUsed": null,
  "expiresAt": null
}
```

**Note:** The `key` field is only returned on creation. Store it securely!

---

### GET /auth/api-keys

List all API keys for the current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "Production API Key",
    "scopes": ["read", "write", "execute"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastUsed": "2024-01-02T00:00:00.000Z",
    "expiresAt": null
  }
]
```

---

### DELETE /auth/api-keys/:id

Delete an API key.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "API key deleted successfully"
}
```

**Errors:**
- `404` - API key not found

---

## Workflow Management

### GET /workflows

List workflows for the current user with filtering, sorting, and pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `search` - Search by name or description
- `tags` - Comma-separated list of tags
- `sortBy` - Sort field (name, createdAt, updatedAt)
- `sortOrder` - Sort order (asc, desc)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Example:**
```
GET /workflows?search=video&tags=ai,automation&sortBy=updatedAt&sortOrder=desc&page=1&limit=10
```

**Response (200):**
```json
{
  "workflows": [
    {
      "id": "uuid",
      "name": "AI Video Generator",
      "description": "Generate videos from text prompts",
      "nodes": [...],
      "userId": "uuid",
      "tags": ["ai", "video"],
      "version": 3,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-02T00:00:00.000Z",
      "nodeCount": 5
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### POST /workflows

Create a new workflow.

**Headers:**
```
Authorization: Bearer <access_token>
x-api-key: <api_key>  (requires 'write' scope)
```

**Request Body:**
```json
{
  "name": "My New Workflow",
  "description": "Description of the workflow",
  "nodes": [
    {
      "id": "node-1",
      "type": "text_to_text",
      "config": {
        "prompt": "Write a story about...",
        "model": "gpt-4o-mini"
      }
    }
  ],
  "tags": ["ai", "text"]
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "My New Workflow",
  "description": "Description of the workflow",
  "nodes": [...],
  "userId": "uuid",
  "tags": ["ai", "text"],
  "version": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "nodeCount": 1
}
```

**Errors:**
- `400` - Name and nodes are required

---

### GET /workflows/:id

Get a specific workflow by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "My Workflow",
  "description": "Description",
  "nodes": [...],
  "userId": "uuid",
  "tags": ["ai"],
  "version": 2,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z",
  "nodeCount": 5
}
```

**Errors:**
- `403` - Access denied (not owner)
- `404` - Workflow not found

---

### PUT /workflows/:id

Update a workflow.

**Headers:**
```
Authorization: Bearer <access_token>
x-api-key: <api_key>  (requires 'write' scope)
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "nodes": [...],
  "tags": ["updated", "tags"]
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "description": "Updated description",
  "nodes": [...],
  "userId": "uuid",
  "tags": ["updated", "tags"],
  "version": 3,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-03T00:00:00.000Z",
  "nodeCount": 5
}
```

**Note:** Updating nodes increments the version number and creates a new version snapshot.

**Errors:**
- `403` - Access denied (not owner)
- `404` - Workflow not found

---

### DELETE /workflows/:id

Delete a workflow.

**Headers:**
```
Authorization: Bearer <access_token>
x-api-key: <api_key>  (requires 'write' scope)
```

**Response (200):**
```json
{
  "message": "Workflow deleted successfully"
}
```

**Errors:**
- `403` - Access denied (not owner)
- `404` - Workflow not found

---

### POST /workflows/:id/clone

Clone a workflow.

**Headers:**
```
Authorization: Bearer <access_token>
x-api-key: <api_key>  (requires 'write' scope)
```

**Response (200):**
```json
{
  "id": "new-uuid",
  "name": "My Workflow (Copy)",
  "description": "Description",
  "nodes": [...],
  "userId": "uuid",
  "tags": ["ai"],
  "version": 1,
  "createdAt": "2024-01-03T00:00:00.000Z",
  "updatedAt": "2024-01-03T00:00:00.000Z",
  "nodeCount": 5
}
```

**Errors:**
- `403` - Access denied (not owner)
- `404` - Workflow not found

---

### POST /workflows/:id/pause

Pause workflow execution (stub).

**Note:** This is a placeholder endpoint. To pause an active execution, use `POST /executions/:id/pause` with the execution ID.

---

### POST /workflows/:id/resume

Resume workflow execution (stub).

**Note:** This is a placeholder endpoint. To resume an execution, use `POST /executions/:id/resume` with the execution ID.

---

### POST /workflows/:id/cancel

Cancel workflow execution (stub).

**Note:** This is a placeholder endpoint. To cancel an execution, use `POST /executions/:id/cancel` with the execution ID.

---

## Workflow Versioning

### GET /workflows/:id/versions

List all versions of a workflow.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response (200):**
```json
{
  "versions": [
    {
      "id": "uuid",
      "workflowId": "uuid",
      "versionNumber": 3,
      "snapshot": {
        "name": "Workflow Name",
        "description": "Description",
        "nodes": [...],
        "tags": ["ai"]
      },
      "changeNote": "Added new nodes",
      "createdAt": "2024-01-03T00:00:00.000Z"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

**Errors:**
- `403` - Access denied (not owner)
- `404` - Workflow not found

---

### POST /workflows/:id/versions

Create a new version snapshot of the current workflow state.

**Headers:**
```
Authorization: Bearer <access_token>
x-api-key: <api_key>  (requires 'write' scope)
```

**Request Body:**
```json
{
  "changeNote": "Added image generation node"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "workflowId": "uuid",
  "versionNumber": 4,
  "snapshot": {
    "name": "Workflow Name",
    "description": "Description",
    "nodes": [...],
    "tags": ["ai"]
  },
  "changeNote": "Added image generation node",
  "createdAt": "2024-01-03T00:00:00.000Z"
}
```

---

### GET /workflows/:id/versions/:version

Get a specific version by version number.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "workflowId": "uuid",
  "versionNumber": 2,
  "snapshot": {
    "name": "Workflow Name",
    "description": "Description",
    "nodes": [...],
    "tags": ["ai"]
  },
  "changeNote": "Initial version",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
- `403` - Access denied (not owner)
- `404` - Version not found

---

### POST /workflows/:id/versions/:version/restore

Restore workflow to a specific version.

**Headers:**
```
Authorization: Bearer <access_token>
x-api-key: <api_key>  (requires 'write' scope)
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Workflow Name",
  "description": "Description",
  "nodes": [...],
  "userId": "uuid",
  "tags": ["ai"],
  "version": 5,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-03T00:00:00.000Z",
  "nodeCount": 3
}
```

**Note:** Restoring creates a new version with the note "Restored from version X".

---

## Execution Management

### GET /executions

List executions with filtering and pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `workflowId` - Filter by workflow ID
- `status` - Filter by status (pending, running, completed, failed, paused)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Example:**
```
GET /executions?workflowId=uuid&status=completed&page=1&limit=10
```

**Response (200):**
```json
{
  "executions": [
    {
      "id": "uuid",
      "workflowId": "uuid",
      "conductorWorkflowId": "conductor-uuid",
      "userId": "uuid",
      "status": "completed",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "completedAt": "2024-01-01T00:05:00.000Z",
      "nodes": [...],
      "error": null
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

---

### GET /executions/:id

Get execution details with live status from Conductor.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "workflowId": "uuid",
  "conductorWorkflowId": "conductor-uuid",
  "userId": "uuid",
  "status": "running",
  "startedAt": "2024-01-01T00:00:00.000Z",
  "completedAt": null,
  "nodes": [],
  "error": null,
  "conductorData": {
    "status": "RUNNING",
    "tasks": [...]
  }
}
```

**Errors:**
- `403` - Access denied (not owner)
- `404` - Execution not found

---

### GET /executions/:id/nodes

Get execution nodes/tasks with detailed status.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "nodes": [
    {
      "nodeId": "node-1",
      "nodeType": "text_to_text",
      "taskId": "task-uuid",
      "status": "completed",
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": "2024-01-01T00:00:30.000Z",
      "output": {
        "text": "Generated text...",
        "model": "gpt-4o-mini"
      },
      "error": null
    }
  ]
}
```

**Errors:**
- `403` - Access denied (not owner)
- `404` - Execution not found

---

### GET /executions/:id/logs

Get execution logs.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "logs": [
    "[2024-01-01T00:00:00.000Z] [INFO] Workflow started",
    "[2024-01-01T00:00:05.000Z] [INFO] Node node-1 completed",
    "[2024-01-01T00:00:10.000Z] [INFO] Node node-2 started"
  ]
}
```

**Errors:**
- `403` - Access denied (not owner)
- `404` - Execution not found

---

### POST /executions/:id/retry

Retry a failed execution.

**Headers:**
```
Authorization: Bearer <access_token>
x-api-key: <api_key>  (requires 'execute' scope)
```

**Response (200):**
```json
{
  "message": "Execution retry initiated"
}
```

**Errors:**
- `403` - Access denied (not owner)
- `404` - Execution not found

---

## Node Operations

### POST /nodes/:taskId/rerun

Rerun a specific node/task in an execution.

**Headers:**
```
Authorization: Bearer <access_token>
x-api-key: <api_key>  (requires 'execute' scope)
```

**Request Body:**
```json
{
  "executionId": "uuid"
}
```

**Response (200):**
```json
{
  "message": "Task rerun initiated",
  "taskId": "task-uuid",
  "taskReferenceName": "node_1"
}
```

**Errors:**
- `400` - Execution ID required
- `403` - Access denied (not owner)
- `404` - Task or execution not found

---

## Template Management (Existing)

These endpoints existed before and remain unchanged:

### GET /templates

List all templates.

### GET /template/:id

Get a specific template.

### POST /template

Create a new template.

### PUT /template/:id

Update a template.

### DELETE /template/:id

Delete a template.

### POST /template/:id/generate

Generate a video from a template.

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Conductor Configuration
CONDUCTOR_URL=https://p5300.winds-os.com/api

# Server Configuration
PORT=8080
```

---

## Example Usage

### Register and Login

```bash
# Register
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass",
    "name": "John Doe"
  }'

# Login
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass"
  }'
```

### Create Workflow

```bash
curl -X POST http://localhost:8080/workflows \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Text to Video",
    "description": "Generate video from text",
    "nodes": [
      {
        "id": "node-1",
        "type": "text_to_text",
        "config": {"prompt": "Write a story"}
      },
      {
        "id": "node-2",
        "type": "text_to_video",
        "config": {"prompt": "${node-1.output.text}"}
      }
    ],
    "tags": ["ai", "video"]
  }'
```

### Create API Key

```bash
curl -X POST http://localhost:8080/auth/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "scopes": ["read", "write", "execute"]
  }'
```

### Use API Key

```bash
curl -X GET http://localhost:8080/workflows \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Rate Limiting

Currently not implemented. Consider adding rate limiting in production.

## CORS

CORS is enabled for all origins. Configure appropriately for production.
