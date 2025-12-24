const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

type RequestOptions = RequestInit & { body?: unknown }

async function apiRequest(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
  })

  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = data?.message || `Request failed (${response.status})`
    throw new Error(message)
  }

  return data
}

function reviveDates(value: any): any {
  if (Array.isArray(value)) {
    return value.map((item) => reviveDates(item))
  }
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {}
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'string' && key.toLowerCase().endsWith('at')) {
        const parsed = new Date(val)
        result[key] = Number.isNaN(parsed.getTime()) ? val : parsed
      } else {
        result[key] = reviveDates(val)
      }
    }
    return result
  }
  return value
}

function withDates<T>(payload: T): T {
  return reviveDates(payload)
}

async function initDatabase(): Promise<void> {
  try {
    await apiRequest('/health')
  } catch (error) {
    console.warn('Backend not reachable:', error)
  }
}

function generateId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${random}`
}

export const projectsApi = {
  getAll: async () => withDates(await apiRequest('/projects')),
  getById: async (id: string) => withDates(await apiRequest(`/projects/${id}`)),
  create: async (project: any) =>
    withDates(await apiRequest('/projects', { method: 'POST', body: project })),
  update: async (id: string, updates: any) =>
    withDates(
      await apiRequest(`/projects/${id}`, { method: 'PUT', body: updates })
    ),
  delete: async (id: string) =>
    apiRequest(`/projects/${id}`, { method: 'DELETE' }),
}

export const templatesApi = {
  getAll: async () => withDates(await apiRequest('/templates')),
  getById: async (id: string) => withDates(await apiRequest(`/templates/${id}`)),
  create: async (template: any) =>
    withDates(await apiRequest('/templates', { method: 'POST', body: template })),
  update: async (id: string, updates: any) =>
    withDates(
      await apiRequest(`/templates/${id}`, { method: 'PUT', body: updates })
    ),
  delete: async (id: string) =>
    apiRequest(`/templates/${id}`, { method: 'DELETE' }),
}

export const generationsApi = {
  getAll: async () => withDates(await apiRequest('/generations')),
  getById: async (id: string) =>
    withDates(await apiRequest(`/generations/${id}`)),
  create: async (generation: any) =>
    withDates(
      await apiRequest('/generations', { method: 'POST', body: generation })
    ),
  update: async (id: string, updates: any) =>
    withDates(
      await apiRequest(`/generations/${id}`, { method: 'PUT', body: updates })
    ),
  delete: async (id: string) =>
    apiRequest(`/generations/${id}`, { method: 'DELETE' }),
}

export const assetsApi = {
  getAll: async () => withDates(await apiRequest('/assets')),
  getById: async (id: string) => withDates(await apiRequest(`/assets/${id}`)),
  create: async (asset: any) =>
    withDates(await apiRequest('/assets', { method: 'POST', body: asset })),
  update: async (id: string, updates: any) =>
    withDates(
      await apiRequest(`/assets/${id}`, { method: 'PUT', body: updates })
    ),
  delete: async (id: string) =>
    apiRequest(`/assets/${id}`, { method: 'DELETE' }),
}

export const brandPresetsApi = {
  getAll: async () => withDates(await apiRequest('/brand-presets')),
  getById: async (id: string) =>
    withDates(await apiRequest(`/brand-presets/${id}`)),
  create: async (preset: any) =>
    withDates(
      await apiRequest('/brand-presets', { method: 'POST', body: preset })
    ),
  update: async (id: string, updates: any) =>
    withDates(
      await apiRequest(`/brand-presets/${id}`, { method: 'PUT', body: updates })
    ),
  delete: async (id: string) =>
    apiRequest(`/brand-presets/${id}`, { method: 'DELETE' }),
}

export const workflowsApi = {
  getAll: async () => withDates(await apiRequest('/workflows')),
  getById: async (id: string) => withDates(await apiRequest(`/workflows/${id}`)),
  getByProjectId: async (projectId: string) =>
    withDates(
      await apiRequest(`/workflows?projectId=${encodeURIComponent(projectId)}`)
    ),
  create: async (workflow: any) =>
    withDates(await apiRequest('/workflows', { method: 'POST', body: workflow })),
  update: async (id: string, updates: any) =>
    withDates(
      await apiRequest(`/workflows/${id}`, { method: 'PUT', body: updates })
    ),
  delete: async (id: string) =>
    apiRequest(`/workflows/${id}`, { method: 'DELETE' }),
}

export { initDatabase, generateId }
