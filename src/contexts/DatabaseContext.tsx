import { createContext, useContext, type ReactNode } from 'react'
import {
  projectsApi,
  templatesApi,
  generationsApi,
  assetsApi,
  brandPresetsApi,
  workflowsApi,
} from '@/lib/db'

interface DatabaseContextType {
  projects: typeof projectsApi
  templates: typeof templatesApi
  generations: typeof generationsApi
  assets: typeof assetsApi
  brandPresets: typeof brandPresetsApi
  workflows: typeof workflowsApi
}

const DatabaseContext = createContext<DatabaseContextType | null>(null)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <DatabaseContext.Provider
      value={{
        projects: projectsApi,
        templates: templatesApi,
        generations: generationsApi,
        assets: assetsApi,
        brandPresets: brandPresetsApi,
        workflows: workflowsApi,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}

export function useDatabase() {
  const context = useContext(DatabaseContext)
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context
}
