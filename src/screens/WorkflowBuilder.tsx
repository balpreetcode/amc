import { useState, useRef, useCallback, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Play,
  Save,
  Settings,
  Trash2,
  Video,
  Mic,
  Languages,
  Sparkles,
  User,
  Music,
  Type,
} from "lucide-react"
import { NodeConfigDrawer } from "@/components/workflow/NodeConfigDrawer"
import { WorkflowSettingsDialog } from "@/components/forms/WorkflowSettingsDialog"
import { useDatabase } from "@/contexts/DatabaseContext"
import type { WorkflowNode, NodeType, Connection, NodeConfig, Workflow } from "@/types"

const nodeTypes: { type: NodeType; label: string; icon: React.ElementType; color: string }[] = [
  { type: "text-to-video", label: "Text → Video", icon: Video, color: "bg-purple-500" },
  { type: "image-to-video", label: "Image → Video", icon: Video, color: "bg-blue-500" },
  { type: "clip-maker", label: "Clip Maker", icon: Video, color: "bg-green-500" },
  { type: "auto-subtitles", label: "Auto Subtitles", icon: Type, color: "bg-yellow-500" },
  { type: "translator", label: "Translator", icon: Languages, color: "bg-cyan-500" },
  { type: "format-resize", label: "Format/Resize", icon: Sparkles, color: "bg-pink-500" },
  { type: "face-swap", label: "Face Swap", icon: User, color: "bg-orange-500" },
  { type: "avatar-generator", label: "Avatar", icon: User, color: "bg-indigo-500" },
  { type: "music-generator", label: "Music", icon: Music, color: "bg-rose-500" },
  { type: "voiceover", label: "Voiceover", icon: Mic, color: "bg-emerald-500" },
]

export function WorkflowBuilder() {
  const { projectId, workflowId } = useParams()
  const navigate = useNavigate()
  const { workflows, generations } = useDatabase()
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draggedNodeType, setDraggedNodeType] = useState<NodeType | null>(null)
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null)

  useEffect(() => {
    const loadWorkflow = async () => {
      if (workflowId && workflowId !== "new") {
        const wf = await workflows.getById(workflowId)
        if (wf) {
          setCurrentWorkflow(wf)
          setNodes(wf.nodes || [])
          setConnections(wf.connections || [])
        }
      }
    }
    loadWorkflow()
  }, [workflowId, workflows])

  const handleSaveWorkflow = async () => {
    if (!projectId) return

    const workflowData = {
      name: currentWorkflow?.name || "New Workflow",
      projectId,
      nodes,
      connections,
      inputs: currentWorkflow?.inputs || [],
      outputs: currentWorkflow?.outputs || [],
      watermarkPolicy: currentWorkflow?.watermarkPolicy || false,
    }

    try {
      if (workflowId && workflowId !== "new") {
        await workflows.update(workflowId, workflowData)
      } else {
        const newWf = await workflows.create(workflowData as any) // Assuming create handles the omit type
        navigate(`/project/${projectId}/workflow/${newWf.id}`, { replace: true })
      }
      // Show success feedback
      console.log("Workflow saved!")
    } catch (error) {
      console.error("Failed to save workflow:", error)
    }
  }

  const handleAddNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      const newNode: WorkflowNode = {
        id: `n${Date.now()}`,
        name: nodeTypes.find((nt) => nt.type === type)?.label || "New Node",
        type,
        position,
        inputBindings: {},
        outputVariableName: `${type.replace(/-/g, "_")}_v1`,
        model: "Veo 3",
        qualityMode: "Standard",
        costEstimate: 100,
        config: getDefaultConfig(type),
      }
      setNodes([...nodes, newNode])
    },
    [nodes]
  )

  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNode(node)
    setDrawerOpen(true)
  }

  const handleNodeDelete = (nodeId: string) => {
    setNodes(nodes.filter((n) => n.id !== nodeId))
    setConnections(connections.filter((c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId))
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
      setDrawerOpen(false)
    }
  }

  const handleNodeUpdate = (updatedNode: WorkflowNode) => {
    setNodes(nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n)))
    setSelectedNode(updatedNode)
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (draggedNodeType) {
      handleAddNode(draggedNodeType, { x, y })
      setDraggedNodeType(null)
    } else if (draggedNodeId) {
      setNodes(nodes.map((n) => (n.id === draggedNodeId ? { ...n, position: { x, y } } : n)))
      setDraggedNodeId(null)
    }
  }

  const handleNodeDragStart = (nodeId: string) => {
    setDraggedNodeId(nodeId)
  }

  const handleNodeTypeDragStart = (type: NodeType) => {
    setDraggedNodeType(type)
  }

  const calculateTotalCost = () => {
    return nodes.reduce((sum, node) => sum + node.costEstimate, 0)
  }

  const handleRunWorkflow = async () => {
    if (!currentWorkflow || !projectId) return

    try {
      await generations.create({
        runId: `run-${Date.now()}`,
        workflowId: currentWorkflow.id,
        workflowName: currentWorkflow.name,
        inputsSnapshot: {}, // In a real app, we'd gather inputs here
        status: "Queued",
        models: nodes.map(n => n.model),
        duration: 0,
        creditsUsed: 0,
        watermark: currentWorkflow.watermarkPolicy,
        outputs: [],
        retriable: true,
      } as any)
      
      console.log("Workflow run started!")
      navigate(`/project/${projectId}`) // Go back to project to see the run
    } catch (error) {
      console.error("Failed to run workflow:", error)
    }
  }

  const handleSettingsSave = (settings: Partial<Workflow>) => {
    if (currentWorkflow) {
      setCurrentWorkflow({ ...currentWorkflow, ...settings })
    }
  }

  return (
    <div className="flex h-screen">
      {/* Left Panel - Node Palette */}
      <div className="w-64 border-r bg-card p-4 overflow-y-auto">
        <h2 className="font-semibold mb-4">Node Palette</h2>
        <div className="space-y-2">
          {nodeTypes.map((nt) => {
            const Icon = nt.icon
            return (
              <div
                key={nt.type}
                draggable
                onDragStart={() => handleNodeTypeDragStart(nt.type)}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-move transition-colors"
              >
                <div className={`w-8 h-8 rounded ${nt.color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">{nt.label}</span>
              </div>
            )
          })}
        </div>

        <div className="mt-8 pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Workflow Info</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Nodes:</span>
              <span>{nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Connections:</span>
              <span>{connections.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Est. Cost:</span>
              <span className="font-medium text-foreground">{calculateTotalCost()} credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/project/${projectId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">{currentWorkflow?.name || "New Workflow"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" onClick={handleSaveWorkflow}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleRunWorkflow}>
              <Play className="h-4 w-4 mr-2" />
              Run Workflow
            </Button>
          </div>
        </div>

        {/* Canvas Area */}
        <div
          ref={canvasRef}
          onDrop={handleCanvasDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex-1 bg-muted/20 relative overflow-auto"
          style={{ backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        >
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Start building your workflow</p>
                <p className="text-sm">Drag nodes from the palette to get started</p>
              </div>
            </div>
          )}

          {/* Connections (SVG lines) */}
          <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            {connections.map((conn) => {
              const sourceNode = nodes.find((n) => n.id === conn.sourceNodeId)
              const targetNode = nodes.find((n) => n.id === conn.targetNodeId)
              if (!sourceNode || !targetNode) return null

              const startX = sourceNode.position.x + 200
              const startY = sourceNode.position.y + 40
              const endX = targetNode.position.x
              const endY = targetNode.position.y + 40

              return (
                <path
                  key={conn.id}
                  d={`M ${startX} ${startY} C ${startX + 50} ${startY}, ${endX - 50} ${endY}, ${endX} ${endY}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const nodeType = nodeTypes.find((nt) => nt.type === node.type)
            const Icon = nodeType?.icon || Video
            return (
              <div
                key={node.id}
                draggable
                onDragStart={() => handleNodeDragStart(node.id)}
                onClick={() => handleNodeClick(node)}
                className="absolute w-[200px] cursor-pointer group"
                style={{ left: node.position.x, top: node.position.y, zIndex: 1 }}
              >
                <Card
                  className={`p-4 transition-all ${
                    selectedNode?.id === node.id
                      ? "ring-2 ring-primary shadow-lg"
                      : "hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-8 h-8 rounded ${nodeType?.color} flex items-center justify-center`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleNodeDelete(node.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <h3 className="font-medium text-sm">{node.name}</h3>
                  <p className="text-xs text-muted-foreground">{nodeType?.label}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {node.model}
                    </Badge>
                    <span className="text-xs text-muted-foreground">~{node.costEstimate} cr</span>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      </div>

      {/* Node Config Drawer */}
      <NodeConfigDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        node={selectedNode}
        onUpdate={handleNodeUpdate}
        availableNodes={nodes}
      />

      {/* Workflow Settings Dialog */}
      <WorkflowSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        workflow={currentWorkflow || undefined}
        onSave={handleSettingsSave}
      />
    </div>
  )
}

function getDefaultConfig(type: NodeType): NodeConfig {
  switch (type) {
    case "text-to-video":
      return {
        prompt: "",
        negativePrompt: "",
        duration: 30,
        aspectRatio: "9:16",
        nativeAudio: true,
      }
    case "image-to-video":
      return {
        sourceImages: [],
        prompt: "",
        duration: 30,
        motionStrength: 50,
        preserveSubject: false,
      }
    case "auto-subtitles":
      return {
        sourceVideo: "",
        language: "English",
        stylePreset: "modern",
        burnIn: true,
        exportFormats: ["SRT"],
      }
    default:
      return {} as NodeConfig
  }
}