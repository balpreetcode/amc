# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI Video Workflow Builder** - a full-stack application for creating automated video generation pipelines using Netflix Conductor orchestration. Users can visually design workflows with 18+ AI-powered nodes (text-to-video, image generation, speech synthesis, video editing, etc.) and execute them through a drag-and-drop canvas interface.

**Tech Stack:**
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express (workflow orchestration worker)
- **Orchestration**: Netflix Conductor (external service at `https://p5200.winds-os.com/api`)
- **Database**: PostgreSQL (for templates)
- **Deployment**: Docker + Traefik (domain-based routing)

## Architecture

### Three-Tier System

1. **Frontend (React SPA)**
   - Canvas-based workflow builder with drag-drop nodes
   - Real-time execution monitoring
   - Template library with CRUD operations
   - Execution history viewer with API call inspection

2. **Backend (Express Worker)**
   - **Dual Role**: HTTP API server + Conductor task worker
   - Polls Conductor for tasks, executes AI generation calls
   - Manages execution history sync (local cache + Conductor queries)
   - Proxies requests to external AI services (OpenAI, Fal AI, etc.)

3. **Conductor Orchestration**
   - External workflow engine managing task dependencies
   - Backend registers as worker polling for specific task types
   - Workflow definitions created on-demand per execution

### Key Concepts

**Workflow Execution Flow:**
```
User clicks "Run" → Frontend POST /workflow/run → Backend creates Conductor workflow
→ Backend polls Conductor → Gets task → Executes AI generator → Updates task status
→ Conductor manages dependencies → Next task assigned → ... → Workflow completes
→ History saved locally + synced from Conductor
```

**Node Types** (18 total):
- **Generators**: `text_to_text`, `text_to_image`, `text_to_video`, `text_to_music`, `text_to_speech`, `image_to_video`, `image_to_image`, `sound_effects`
- **Processors**: `face_swap`, `lip_sync`, `ai_avatar`, `enhancer`, `image_object_removal`, `image_remove_background`
- **Utilities**: `upload_files`, `split_text`
- **Video Editing**: `edit_video`, `clip_merger`

Each node type maps to:
- A Conductor task definition (created dynamically)
- A generator module in `backend/generators/`
- A form schema in the frontend

### Data Flow Patterns

**Template System:**
- Templates stored in PostgreSQL (`templates` table)
- Include workflow nodes + optional video preview URL
- Frontend fetches via `/templates` API

**Execution History:**
- **Dual storage**: Local JSON file (`workflow-history.json`) + Conductor
- **Sync logic**: When local < 50 and Conductor ≥ 50, sync from Conductor
- History includes full node results + API call details (request/response pairs)

**Worker Polling:**
- Backend registers task definitions on startup
- Polls Conductor every 1s (configurable via `POLL_INTERVAL_MS`)
- Executes tasks via generator modules, updates Conductor with results

## Development Commands

### Frontend
```bash
npm run dev          # Start Vite dev server (port 3465)
npm run build        # TypeScript compile + Vite production build
npm run lint         # ESLint check
npm run preview      # Preview production build
```

### Backend
```bash
cd backend
npm start            # Start worker + API server (port 3002 or PORT env var)
npm run dev          # Same as start (no hot reload)
```

### Docker (Recommended for Production)
```bash
# Start both frontend + backend with Traefik
docker compose up -d

# Rebuild after code changes
docker compose up -d --build

# View logs
docker compose logs -f

# Access:
# - Frontend: http://workflow.localhost
# - Backend API: http://workflow-api.localhost
```

### Environment Setup

**Backend** requires `backend/.env`:
```env
OPENAI_API_KEY=sk-...
FAL_KEY=...
CONDUCTOR_URL=https://p5200.winds-os.com/api
PORT=8080  # For Docker; defaults to 3002 locally
```

**Frontend** uses `VITE_BACKEND_URL` (defaults to empty string, proxied in dev mode).

## File Structure Patterns

### Backend Generators (`backend/generators/`)
Each generator exports a function that:
1. Takes node input data + API keys from env
2. Calls external AI service (OpenAI, Fal AI, etc.)
3. Returns output object with URLs/data
4. Handles file downloads to `/temp` and `/output` directories

**Example pattern:**
```javascript
async function generateImage(prompt, model) {
  const response = await axios.post(AI_API_URL, { prompt });
  const imageUrl = await downloadFile(response.data.url, outputPath);
  return { imageUrl };
}
```

### Frontend Components

**Core UI Components:**
- `WorkflowCanvas`: Main canvas with node drag/drop, connections
- `WorkflowNode`: Individual node rendering (18 types with icons)
- `NodePropertiesPanel`: Right sidebar form for editing node properties
- `AddNodeMenu`: Left sidebar for adding new nodes
- `ExecutionHistory`: Table view with video player + API call inspection modal

**State Management:**
- `WorkflowContext`: Global workflow state (nodes, connections, execution status)
- Custom hooks: `useTemplates`, `useWorkflow`

### Node Connection Logic
Nodes connect via `connections` array in workflow state:
```typescript
{ from: 'node-1', to: 'node-2', fromOutput: 'output', toInput: 'input' }
```

Connections validated on execution:
- No cycles allowed
- Each node's dependencies resolved before execution

## Common Patterns

### Adding a New Node Type

1. **Backend**: Create generator in `backend/generators/my-generator.js`
2. **Backend**: Add case in `executeNodeTask()` function in `server.js`
3. **Frontend**: Add node type to `NODE_TYPES` in `WorkflowNode.tsx`
4. **Frontend**: Add form fields in `NodePropertiesPanel.tsx`
5. **Both**: Update node type definition in shared types

### Debugging Workflows

1. Check backend logs for task execution errors
2. Use `/workflow/:id/status` API to inspect Conductor workflow state
3. View execution history modal for full request/response of each node
4. Check `/temp` and `/output` directories for generated files

### History Sync Mechanism

The sync function (`syncHistoryFromConductor`) runs on every `/workflow/history` request:
- Compares local count vs Conductor total
- If local < 50 and Conductor ≥ 50, fetches up to 100 from Conductor search API
- Merges avoiding duplicates, keeps most recent 50
- Saves to local JSON file

## Docker + Traefik Setup

**Services:**
- `workflow-frontend`: Multi-stage build (Node builder → Nginx server)
- `workflow-backend`: Node.js with ffmpeg for video processing

**Key Details:**
- Both listen on port 8080 internally
- Traefik routes via `Host()` rules to `*.localhost` domains
- Healthchecks use `127.0.0.1` instead of `localhost` (IPv6 issue)
- Backend creates `/temp` and `/output` directories with node user permissions
- Volume `workflow-output` persists generated videos

**Networking:**
- `proxy` network: External, shared with Traefik
- `workflow-internal`: Backend-frontend communication

## API Endpoints Reference

### Workflow Execution
- `POST /workflow/run` - Start workflow execution
- `GET /workflow/:id/status` - Get workflow status (polls Conductor)
- `GET /workflow/history` - Get execution history (auto-syncs from Conductor)

### Templates
- `GET /templates` - List all templates
- `POST /template` - Create new template
- `PUT /template/:id` - Update template
- `DELETE /template/:id` - Delete template

### File Serving
- `GET /output/:filename` - Download generated videos/audio
- `GET /download/:filename` - Force download with headers

### Health
- `GET /health` - Backend health check (used by Docker healthcheck)

## Important Caveats

1. **Conductor Dependency**: Backend requires Conductor to be accessible at `CONDUCTOR_URL`. If unreachable, workflow execution fails.

2. **File Storage**: Generated files in `/output` are NOT persisted across backend restarts unless using Docker volume.

3. **History Sync**: Only syncs when local < 50. Deleting local history file triggers full resync on next request.

4. **Worker Registration**: Backend auto-registers all 18 task definitions on startup. Changes require backend restart.

5. **Database**: PostgreSQL connection required for templates. Connection string in `backend/db.js` (defaults to localhost:5432/postgres).

6. **Port Conflicts**: When running locally (non-Docker), ensure ports 3002 (backend) and 3465 (frontend) are available.
