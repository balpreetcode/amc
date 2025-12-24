import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Clock, Sparkles, FolderOpen } from "lucide-react"
import type { Project } from "@/types"
import { useDatabase } from "@/contexts/DatabaseContext"
import { CreateProjectDialog } from "@/components/forms/CreateProjectDialog"

export function StudioHome({ initialCreateOpen = false }: { initialCreateOpen?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const database = useDatabase()
  const [createDialogOpen, setCreateDialogOpen] = useState(initialCreateOpen)
  const [projectList, setProjectList] = useState<Project[]>([])
  
  const templateId = location.state?.templateId

  useEffect(() => {
    const loadProjects = async () => {
      const projects = await database.projects.getAll()
      setProjectList(projects)
    }
    loadProjects()
  }, [database])

  // Sync state with prop if it changes (e.g. navigation)
  useEffect(() => {
    setCreateDialogOpen(initialCreateOpen)
  }, [initialCreateOpen])

  const handleCreateProject = async (projectData: Partial<Project>) => {
    try {
      // The API expects Omit<Project, "id" | "createdAt" | "updatedAt">
      // We cast here assuming the dialog provides all necessary fields
      await database.projects.create(projectData as any)
      
      // Refresh list
      const projects = await database.projects.getAll()
      setProjectList(projects)
      setCreateDialogOpen(false)
      
      // Navigate to the new project or studio if we were on /project/new
      if (initialCreateOpen) {
         navigate(`/studio`) 
      }
    } catch (error) {
      console.error("Failed to create project:", error)
    }
  }

  const handleDialogChange = (open: boolean) => {
    setCreateDialogOpen(open)
    if (!open && initialCreateOpen) {
      navigate('/studio')
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Studio</h1>
          <p className="text-muted-foreground mt-1">Create and manage your AI content</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          New Project
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setCreateDialogOpen(true)}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Quick Create
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Start creating from scratch</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/templates")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Browse pre-built workflows</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/generations")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Generations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">View render queue & history</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/assets")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Manage your media library</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Projects</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectList.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/project/${project.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant="secondary">{project.contentType}</Badge>
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Updated {project.updatedAt.toLocaleDateString()}
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={handleDialogChange}
        onSubmit={handleCreateProject}
        templateId={templateId}
      />
    </div>
  )
}