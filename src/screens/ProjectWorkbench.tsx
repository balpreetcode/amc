import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  ArrowLeft,
  Play,
  Upload,
  FolderOpen,
  Plus,
  MoreVertical,
  Edit,
} from "lucide-react"
import { useDatabase } from "@/contexts/DatabaseContext"
import type { Project, Asset, Workflow } from "@/types"

export function ProjectWorkbench() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { projects, workflows, assets, generations } = useDatabase()
  const [project, setProject] = useState<Project | null>(null)
  const [workflowList, setWorkflowList] = useState<Workflow[]>([])
  const [assetList, setAssetList] = useState<Asset[]>([])
  const [generationList, setGenerationList] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [newAsset, setNewAsset] = useState({
    title: "",
    file: "",
    tags: [] as string[],
    notes: "",
  })

  useEffect(() => {
    if (projectId && projectId !== "new") {
      loadProjectData()
    }
  }, [projectId])

  const loadProjectData = async () => {
    try {
      if (projectId && projectId !== "new") {
        const [projectData, workflowsData, assetsData, generationsData] = await Promise.all([
          projects.getById(projectId),
          workflows.getByProjectId(projectId),
          assets.getAll(),
          generations.getAll(),
        ])

        if (projectData) {
          setProject(projectData)
        }
        setWorkflowList(workflowsData)
        setAssetList(assetsData)

        // Filter generations for this project
        const projectGenerations = generationsData
          .filter((g) => g.workflowId && workflowList.some((w) => w.id === g.workflowId))
          .slice(0, 5)
          .map((g) => ({
            id: g.id,
            workflowName: g.workflowName,
            inputsSnapshot: g.inputsSnapshot,
            status: g.status,
            watermark: g.watermark,
            outputs: g.outputs,
          }))
        setGenerationList(projectGenerations)
      }
    } catch (error) {
      console.error('Failed to load project data:', error)
    }
  }

  const handleSaveProject = async () => {
    if (project && projectId && projectId !== "new") {
      try {
        const updated = await projects.update(projectId, project)
        if (updated) {
          setProject(updated)
        }
        setIsEditing(false)
      } catch (error) {
        console.error('Failed to save project:', error)
      }
    }
  }

  const handleUploadAsset = async () => {
    try {
      if (!newAsset.file) return
      await assets.create({
        ...newAsset,
        assetType: "Video",
        sourceRights: "Owned",
      } as any)
      setUploadDialogOpen(false)
      setNewAsset({ title: "", file: "", tags: [], notes: "" })
      await loadProjectData()
    } catch (error) {
      console.error('Failed to upload asset:', error)
    }
  }

  const handleRunWorkflow = async (workflow: Workflow, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    try {
      await generations.create({
        runId: `run-${Date.now()}`,
        workflowId: workflow.id,
        workflowName: workflow.name,
        inputsSnapshot: {},
        status: "Queued",
        models: ["Veo 3"], // Default or derived from workflow
        duration: 0,
        creditsUsed: 0,
        watermark: workflow.watermarkPolicy,
        outputs: [],
        retriable: true,
      } as any)
      
      // Refresh data to show new generation
      await loadProjectData()
    } catch (error) {
      console.error("Failed to run workflow:", error)
    }
  }

  if (!project && projectId !== "new") {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    )
  }

  if (projectId === "new") {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Creating new project...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/studio")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={project?.name || ""}
                onChange={(e) => setProject({ ...project!, name: e.target.value })}
                className="text-2xl font-bold h-auto p-1"
              />
              <Button size="sm" onClick={handleSaveProject}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project?.name}</h1>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <Button onClick={() => navigate(`/project/${projectId}/workflow/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      <Tabs defaultValue="workflows">
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="generations">Generations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflowList.map((workflow) => (
              <Card
                key={workflow.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/project/${projectId}/workflow/${workflow.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    {workflow.inputs.length} inputs • {workflow.outputs.filter((o) => o.enabled).length} outputs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {workflow.outputs.slice(0, 2).map((output) => (
                        <Badge key={output.id} variant="secondary" className="text-xs">
                          {output.type}
                        </Badge>
                      ))}
                    </div>
                    <Button size="sm" onClick={(e) => handleRunWorkflow(workflow, e)}>
                      <Play className="h-4 w-4 mr-1" />
                      Run
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Assets Tab */}
        <TabsContent value="assets" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Input placeholder="Search assets..." className="w-[250px]" />
            </div>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Asset
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {assetList.map((asset) => (
              <Card key={asset.id}>
                <CardHeader className="pb-3">
                  <div className="aspect-square bg-muted rounded-md flex items-center justify-center mb-2">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-base">{asset.title}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline">{asset.assetType}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Generations Tab */}
        <TabsContent value="generations" className="mt-6">
          <Card>
            <div className="divide-y">
              {generationList.map((gen) => (
                <div key={gen.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          gen.status === "Succeeded"
                            ? "bg-green-500"
                            : gen.status === "Running"
                            ? "bg-yellow-500 animate-pulse"
                            : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium">{gen.workflowName}</p>
                        <p className="text-sm text-muted-foreground">
                          {Object.values(gen.inputsSnapshot || {}).join(", ") || "No inputs"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        gen.status === "Succeeded" ? "success" : gen.status === "Running" ? "warning" : "destructive"
                      }
                    >
                      {gen.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>Configure your project defaults and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Content Type</Label>
                  <Select
                    value={project?.contentType || "video"}
                    onChange={(e) => setProject({ ...project!, contentType: e.target.value as any })}
                  >
                    <option>Video</option>
                    <option>Image</option>
                    <option>Audio</option>
                    <option>Workflow-only</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Duration (seconds)</Label>
                  <Input
                    type="number"
                    value={project?.defaultDuration || 30}
                    onChange={(e) => setProject({ ...project!, defaultDuration: parseInt(e.target.value) })}
                    min={1}
                    max={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aspect Ratio</Label>
                  <Select
                    value={project?.defaultAspectRatio || "9:16"}
                    onChange={(e) => setProject({ ...project!, defaultAspectRatio: e.target.value as any })}
                  >
                    <option>9:16</option>
                    <option>1:1</option>
                    <option>16:9</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Language</Label>
                  <Select
                    value={project?.primaryLanguage || "English"}
                    onChange={(e) => setProject({ ...project!, primaryLanguage: e.target.value as any })}
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={project?.description || ""}
                  onChange={(e) => setProject({ ...project!, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProject}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Asset Dialog */}
      {uploadDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setUploadDialogOpen(false)} />
          <div className="relative z-50 w-full max-w-lg bg-background border rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Upload Asset</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>File</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setNewAsset({
                          ...newAsset,
                          file: file.name,
                          title: newAsset.title || file.name,
                        })
                      }
                    }}
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {newAsset.file ? newAsset.file : "Drag & drop or click to upload"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newAsset.title}
                  onChange={(e) => setNewAsset({ ...newAsset, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newAsset.notes}
                  onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUploadAsset} disabled={!newAsset.file}>Upload</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
