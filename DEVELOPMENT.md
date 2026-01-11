# Development Setup

## Quick Start

Open **two terminals** and run:

```bash
# Terminal 1 - Backend (with nodemon auto-restart)
cd backend && npm run dev

# Terminal 2 - Frontend (with Vite hot reload)
npm run dev
```

## Services & Ports

| Service | URL | Port | Auto-Reload |
|---------|-----|------|-------------|
| **Frontend** | http://localhost:3465 | 3465 | ✅ Vite HMR |
| **Backend** | http://localhost:3002 | 3002 | ✅ Nodemon |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (localhost:3465)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vite Dev Server (3465)                    │
│                    (React + TypeScript)                      │
│   Proxies: /workflow, /api, /templates, /session → :3002    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Server (3002)                      │
│                   (Express + Node.js)                        │
│         Uses: MongoDB, PostgreSQL, R2 Storage                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│   - Conductor API (https://p5300.winds-os.com/api)          │
│   - OpenAI API                                               │
│   - Fal.ai API                                               │
│   - Cloudflare R2                                            │
└─────────────────────────────────────────────────────────────┘
```

## Vite Proxy Configuration

The frontend proxies these routes to the backend (`vite.config.ts`):

| Route | Target |
|-------|--------|
| `/workflow` | http://localhost:3002 |
| `/health` | http://localhost:3002 |
| `/api` | http://localhost:3002 |
| `/templates` | http://localhost:3002 |
| `/template` | http://localhost:3002 |
| `/download` | http://localhost:3002 |
| `/session` | http://localhost:3002 |

## Backend Nodemon Configuration

Nodemon watches for changes in (`backend/nodemon.json`):

**Watched paths:**
- `*.js`, `controllers/`, `generators/`, `middleware/`, `models/`, `providers/`, `routes/`, `utils/`

**Ignored paths:**
- `node_modules/`, `output/`, `logs/`, `storage/`, `temp/`, `tempImages/`, `_tmp/`
- `workflow-history.json`, `templates.json`

## Environment Variables

### Root `.env`
```
OPENAI_API_KEY=...
FAL_KEY=...
CONDUCTOR_URL=https://p5300.winds-os.com/api
```

### Backend `.env`
```
OPENAI_API_KEY=...
FAL_KEY=...
CONDUCTOR_URL=https://p5300.winds-os.com/api
R2_ENDPOINT=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=workflow-outputs
R2_PUBLIC_URL=...
```

## Docker (UAT/Dev)

For containerized testing with Traefik:

```bash
docker compose up
```

| Service | URL | Internal Port |
|---------|-----|---------------|
| Frontend | http://workflow.localhost | 8080 |
| Backend | http://workflow-api.localhost | 8080 |

## Stopping Services

```bash
# Find and kill processes on specific ports
lsof -ti:3465 | xargs kill -9  # Frontend
lsof -ti:3002 | xargs kill -9  # Backend
```

## Troubleshooting

### Port already in use
```bash
lsof -i :3002  # Check what's using the port
kill <PID>     # Kill the process
```

### Backend not restarting on changes
- Ensure you're editing files in watched directories
- Check `backend/nodemon.json` for ignored paths
- Type `rs` in the backend terminal to force restart
