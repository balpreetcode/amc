# AGENTS.md

This file provides guidance for agentic coding agents working in this repository.

## Build / Lint / Test Commands

### Frontend (React + TypeScript + Vite)
```bash
npm run dev          # Start Vite dev server (port 3465)
npm run build        # TypeScript compile + Vite production build
npm run lint         # ESLint check
npm run preview      # Preview production build
```

### Backend (Node.js + Express)
```bash
cd backend
npm start            # Start worker + API server (port 3002 or PORT env var)
npm run dev          # Same as start (uses nodemon)
```

### Testing (Playwright)
```bash
# Run all tests
npx playwright test

# Run a single test file
npx playwright test test-workflow-execution.spec.ts

# Run a single test case (use --grep for name matching)
npx playwright test --grep "should check backend health"

# Run tests in UI mode
npx playwright test --ui

# Run tests in headed mode (show browser)
npx playwright test --headed

# Run specific test in headed mode
npx playwright test test-workflow-execution.spec.ts --headed --grep "should check backend health"

# View test report
npx playwright show-report
```

## Code Style Guidelines

### TypeScript / JavaScript (Frontend)

**Imports:**
- Group imports: external libraries first, then internal modules, then relative imports
- Use named imports for utilities and types: `import { useState, useCallback } from 'react'`
- Use default imports for components and contexts: `import { useWorkflowContext } from '../context/WorkflowContext'`
- Keep import order consistent across files

**TypeScript:**
- Use `interface` for object shapes, `type` for unions/literals
- Define component props as interfaces: `interface WorkflowNodeProps`
- Use proper generics: `Promise<T>`, `Record<string, unknown>`
- Avoid `any` - use `unknown` or proper type guards instead
- Use `const` assertions: `'running' as const`

**Formatting:**
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in multiline objects/arrays
- Arrow functions for callbacks and short functions

**Naming Conventions:**
- Components: PascalCase (e.g., `WorkflowNode`, `NodePropertiesPanel`)
- Functions/variables: camelCase (e.g., `runWorkflow`, `workflowId`)
- Constants: UPPER_SNAKE_CASE (e.g., `BACKEND_URL`, `MAX_HISTORY`)
- Types/interfaces: PascalCase (e.g., `WorkflowState`, `ExecutionMode`)
- Files: kebab-case (e.g., `workflow-node.tsx`, `use-workflow.ts`)

**React Patterns:**
- Use functional components with hooks
- Prefer `useCallback` for functions passed to child components
- Use `useRef` for DOM elements and values that persist across renders
- Destructure props in function signature when possible
- Use `export const` for named exports, `export default` for single exports

**Error Handling:**
- Use try-catch blocks for async operations
- Log errors with `console.error('[Context]', error)`
- Return `false` or throw for failure conditions
- Provide user-friendly error messages in state

### JavaScript (Backend - CommonJS)

**Imports/Exports:**
- Use `require()` for imports: `const express = require('express')`
- Use `module.exports` for exports: `module.exports = { generateText, parseJSON }`

**Formatting:**
- 4-space indentation (Node.js convention)
- Semicolons required
- Single quotes for strings
- Trailing commas in multiline objects/arrays

**Functions:**
- Use JSDoc comments for all exported functions (see `backend/generators/text.js`)
- Include parameter types in JSDoc: `@param {string} prompt`
- Include return types in JSDoc: `@returns {Promise<string>}`

**Error Handling:**
- Use try-catch blocks for async operations
- Log errors with context: `console.error('[Generator]', error)`
- Attach metadata to error objects for debugging
- Rethrow errors after logging

**File Structure:**
- `backend/generators/` - Individual generator modules (text, image, video, etc.)
- `backend/routes/` - Express route handlers
- `backend/controllers/` - Business logic separated from routes
- `backend/models/` - Database models (MongoDB)
- `backend/utils/` - Shared utilities

## API Integration

### Frontend API Calls
- Use utility functions from `src/utils/api.ts`:
  - `apiGet<T>(url)` - GET request with session token
  - `apiPost<T>(url, data)` - POST request with session token
  - `apiPut<T>(url, data)` - PUT request with session token
  - `apiDelete<T>(url)` - DELETE request with session token
- Session tokens automatically added via `getSessionToken()` and `getAuthHeaders()`
- Always handle response errors and throw descriptive errors

### Backend API Endpoints
- Follow REST conventions: GET (read), POST (create), PUT (update), DELETE (delete)
- Return JSON with `{ success: boolean, data?: any, error?: string }` structure
- Use session authentication middleware where needed
- Log all API calls with context: `[API] POST /workflow/run`

## Testing Patterns

**Playwright Tests:**
- Use `test.describe()` for grouping related tests
- Use `test()` for individual test cases
- Use `expect()` for assertions (Playwright's built-in)
- Use `console.log()` for debugging output
- Test files should be in root directory with `.spec.ts` extension
- Use `BACKEND_URL = 'http://localhost:3002'` constant in tests

**Test Structure:**
```typescript
test('should describe what is being tested', async ({ request }) => {
  const response = await request.get(`${BACKEND_URL}/endpoint`);
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.key).toBeDefined();
});
```

## Environment Variables

**Backend (.env):**
- `CONDUCTOR_URL` - Netflix Conductor API URL
- `OPENAI_API_KEY` - OpenAI API key
- `FAL_KEY` - Fal AI API key
- `PORT` - Server port (default 3002)
- `ENABLE_MEDIA_PROXY` - Enable URL encryption (true/false)
- `PROXY_SECRET` - Encryption key for media proxy

**Frontend (.env):**
- `VITE_BACKEND_URL` - Backend API URL (empty string when using Vite proxy)

## Important Notes

- Backend uses CommonJS (require/module.exports), Frontend uses ES modules (import/export)
- Never commit secrets or API keys
- Use MongoDB for data persistence
- Conductor orchestration is external at `CONDUCTOR_URL`
- Frontend uses localStorage for workflow persistence
- Backend stores workflow history in `workflow-history.json`
- Use TypeScript strict mode - no implicit any
- Run `npm run lint` before committing changes
- All tests must pass: `npx playwright test`
