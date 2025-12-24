import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { X } from "lucide-react"
import type { WorkflowNode } from "@/types"

interface NodeConfigDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: WorkflowNode | null
  onUpdate: (node: WorkflowNode) => void
  availableNodes: WorkflowNode[]
}

export function NodeConfigDrawer({ open, onOpenChange, node, onUpdate, availableNodes }: NodeConfigDrawerProps) {
  const [localNode, setLocalNode] = useState<WorkflowNode | null>(node)

  if (!open || !node) return null

  const handleSave = () => {
    if (localNode) {
      onUpdate(localNode)
    }
    onOpenChange(false)
  }

  const updateNode = (updates: Partial<WorkflowNode>) => {
    setLocalNode({ ...localNode!, ...updates })
  }

  const updateConfig = (key: string, value: unknown) => {
    setLocalNode({
      ...localNode!,
      config: { ...localNode!.config, [key]: value },
    })
  }

  const availableVariables = availableNodes.flatMap((n) => [
    `\${${n.outputVariableName}}`,
  ])

  const renderNodeSpecificConfig = () => {
    switch (node.type) {
      case "text-to-video":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Prompt *</Label>
              <Textarea
                value={(localNode?.config as any)?.prompt || ""}
                onChange={(e) => updateConfig("prompt", e.target.value)}
                placeholder="Describe your video..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Negative Prompt</Label>
              <Textarea
                value={(localNode?.config as any)?.negativePrompt || ""}
                onChange={(e) => updateConfig("negativePrompt", e.target.value)}
                placeholder="What to avoid in the video..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  value={(localNode?.config as any)?.duration || 30}
                  onChange={(e) => updateConfig("duration", parseInt(e.target.value))}
                  min={1}
                  max={60}
                />
              </div>
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select
                  value={(localNode?.config as any)?.aspectRatio || "9:16"}
                  onChange={(e) => updateConfig("aspectRatio", e.target.value)}
                >
                  <option>9:16</option>
                  <option>1:1</option>
                  <option>16:9</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motion Level: {(localNode?.config as any)?.motionLevel || 5}</Label>
              <Slider
                value={[(localNode?.config as any)?.motionLevel || 5]}
                onValueChange={(v) => updateConfig("motionLevel", v[0])}
                min={1}
                max={10}
              />
            </div>
            <div className="space-y-2">
              <Label>Camera Style</Label>
              <Select
                value={(localNode?.config as any)?.cameraStyle || "cinematic"}
                onChange={(e) => updateConfig("cameraStyle", e.target.value)}
              >
                <option>cinematic</option>
                <option>documentary</option>
                <option>action</option>
                <option>static</option>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Native Audio Generation</Label>
              <Switch
                checked={(localNode?.config as any)?.nativeAudio || false}
                onCheckedChange={(v) => updateConfig("nativeAudio", v)}
              />
            </div>
          </div>
        )

      case "image-to-video":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source Images</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground">Drag & drop images or click to upload</p>
              </div>
              {((localNode?.config as any)?.sourceImages || []).length > 0 && (
                <div className="flex gap-2 mt-2">
                  {(localNode?.config as any).sourceImages.map((img: string, i: number) => (
                    <Badge key={i} variant="secondary">{img}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Prompt (optional)</Label>
              <Textarea
                value={(localNode?.config as any)?.prompt || ""}
                onChange={(e) => updateConfig("prompt", e.target.value)}
                placeholder="Additional instructions..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  value={(localNode?.config as any)?.duration || 30}
                  onChange={(e) => updateConfig("duration", parseInt(e.target.value))}
                  min={1}
                  max={60}
                />
              </div>
              <div className="space-y-2">
                <Label>Motion Strength: {(localNode?.config as any)?.motionStrength || 50}</Label>
                <Slider
                  value={[(localNode?.config as any)?.motionStrength || 50]}
                  onValueChange={(v) => updateConfig("motionStrength", v[0])}
                  min={1}
                  max={100}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Preserve Subject</Label>
              <Switch
                checked={(localNode?.config as any)?.preserveSubject || false}
                onCheckedChange={(v) => updateConfig("preserveSubject", v)}
              />
            </div>
          </div>
        )

      case "auto-subtitles":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source Video</Label>
              <Select
                value={(localNode?.config as any)?.sourceVideo || ""}
                onChange={(e) => updateConfig("sourceVideo", e.target.value)}
              >
                <option value="">Select video input...</option>
                {availableVariables.filter((v) => v.includes("video")).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={(localNode?.config as any)?.language || "English"}
                onChange={(e) => updateConfig("language", e.target.value)}
              >
                <option>Auto-detect</option>
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Style Preset</Label>
              <Select
                value={(localNode?.config as any)?.stylePreset || "modern"}
                onChange={(e) => updateConfig("stylePreset", e.target.value)}
              >
                <option>modern</option>
                <option>classic</option>
                <option>minimal</option>
                <option>bold</option>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Burn-in Captions</Label>
              <Switch
                checked={(localNode?.config as any)?.burnIn || false}
                onCheckedChange={(v) => updateConfig("burnIn", v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Export Formats</Label>
              <div className="flex gap-2">
                {["SRT", "VTT"].map((fmt) => (
                  <label key={fmt} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={((localNode?.config as any)?.exportFormats || []).includes(fmt)}
                      onChange={(e) => {
                        const current = (localNode?.config as any)?.exportFormats || []
                        updateConfig(
                          "exportFormats",
                          e.target.checked ? [...current, fmt] : current.filter((f: string) => f !== fmt)
                        )
                      }}
                    />
                    <span className="text-sm">{fmt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      case "face-swap":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Video</Label>
              <Select
                value={(localNode?.config as any)?.targetVideo || ""}
                onChange={(e) => updateConfig("targetVideo", e.target.value)}
              >
                <option value="">Select video input...</option>
                {availableVariables.filter((v) => v.includes("video")).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source Face Images</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground">Upload face images...</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Occlusion Handling</Label>
              <Switch
                checked={(localNode?.config as any)?.occlusionHandling || false}
                onCheckedChange={(v) => updateConfig("occlusionHandling", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>UHD Optimize</Label>
              <Switch
                checked={(localNode?.config as any)?.uhdOptimize || false}
                onCheckedChange={(v) => updateConfig("uhdOptimize", v)}
              />
            </div>
          </div>
        )

      case "music-generator":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Prompt *</Label>
              <Textarea
                value={(localNode?.config as any)?.prompt || ""}
                onChange={(e) => updateConfig("prompt", e.target.value)}
                placeholder="Describe the music..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select
                  value={(localNode?.config as any)?.genre || "electronic"}
                  onChange={(e) => updateConfig("genre", e.target.value)}
                >
                  <option>electronic</option>
                  <option>ambient</option>
                  <option>rock</option>
                  <option>pop</option>
                  <option>classical</option>
                  <option>hip-hop</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mood</Label>
                <Select
                  value={(localNode?.config as any)?.mood || "upbeat"}
                  onChange={(e) => updateConfig("mood", e.target.value)}
                >
                  <option>upbeat</option>
                  <option>calm</option>
                  <option>dark</option>
                  <option>energetic</option>
                  <option>melancholic</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BPM</Label>
                <Input
                  type="number"
                  value={(localNode?.config as any)?.bpm || 120}
                  onChange={(e) => updateConfig("bpm", parseInt(e.target.value))}
                  min={60}
                  max={200}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (seconds)</Label>
                <Input
                  type="number"
                  value={(localNode?.config as any)?.duration || 30}
                  onChange={(e) => updateConfig("duration", parseInt(e.target.value))}
                  min={1}
                  max={180}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Loop</Label>
              <Switch
                checked={(localNode?.config as any)?.loop || false}
                onCheckedChange={(v) => updateConfig("loop", v)}
              />
            </div>
          </div>
        )

      case "translator":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Input Source</Label>
              <Select
                value={(localNode?.config as any)?.inputText ? "text" : (localNode?.config as any)?.inputSubtitles ? "subtitles" : ""}
                onChange={(e) => {
                  if (e.target.value === "text") updateConfig("inputText", "")
                  else updateConfig("inputSubtitles", "")
                }}
              >
                <option value="">Select input...</option>
                <option value="text">Text</option>
                <option value="subtitles">Subtitles</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Languages</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Spanish", "French", "German", "Japanese", "Chinese", "Portuguese"].map((lang) => (
                  <label key={lang} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={((localNode?.config as any)?.targetLanguages || []).includes(lang)}
                      onChange={(e) => {
                        const current = (localNode?.config as any)?.targetLanguages || []
                        updateConfig(
                          "targetLanguages",
                          e.target.checked ? [...current, lang] : current.filter((l: string) => l !== lang)
                        )
                      }}
                    />
                    <span className="text-sm">{lang}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Preserve Timing</Label>
              <Switch
                checked={(localNode?.config as any)?.preserveTiming || false}
                onCheckedChange={(v) => updateConfig("preserveTiming", v)}
              />
            </div>
          </div>
        )

      default:
        return <p className="text-muted-foreground">No specific configuration for this node type.</p>
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex flex-col h-full">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{node.type}</Badge>
                <DrawerTitle>{node.name}</DrawerTitle>
              </div>
              <DrawerClose>
                <X className="h-5 w-5" />
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-auto p-6">
            <Tabs defaultValue="config">
              <TabsList className="mb-4">
                <TabsTrigger value="config">Configuration</TabsTrigger>
                <TabsTrigger value="bindings">Bindings</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="config">
                {renderNodeSpecificConfig()}
              </TabsContent>

              <TabsContent value="bindings">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Output Variable Name</Label>
                    <Input
                      value={localNode?.outputVariableName || ""}
                      onChange={(e) => updateNode({ outputVariableName: e.target.value })}
                      placeholder="video_v1"
                    />
                    <p className="text-xs text-muted-foreground">Reference this output as <code>{"${value}"}</code></p>
                  </div>

                  <div className="space-y-2">
                    <Label>Input Bindings</Label>
                    <p className="text-xs text-muted-foreground">Map node inputs to workflow variables</p>
                    {Object.entries(localNode?.inputBindings || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2 items-center">
                        <Label className="w-32 text-sm">{key}</Label>
                        <Input
                          value={value}
                          onChange={(e) => updateNode({
                            inputBindings: { ...localNode!.inputBindings, [key]: e.target.value }
                          })}
                          placeholder="${variable}"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Available Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {availableVariables.map((v) => (
                        <Badge key={v} variant="outline" className="cursor-pointer hover:bg-secondary">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Node Name</Label>
                    <Input
                      value={localNode?.name || ""}
                      onChange={(e) => updateNode({ name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Model / Integration</Label>
                    <Select
                      value={localNode?.model || "Veo 3"}
                      onChange={(e) => updateNode({ model: e.target.value as any })}
                    >
                      <option>Veo 3</option>
                      <option>Kling 2.1</option>
                      <option>PixVerse</option>
                      <option>Stable Diffusion</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quality Mode</Label>
                    <Select
                      value={localNode?.qualityMode || "Standard"}
                      onChange={(e) => updateNode({ qualityMode: e.target.value as any })}
                    >
                      <option>Standard</option>
                      <option>High</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Retry Policy</Label>
                    <Select
                      value={localNode?.retryPolicy || "none"}
                      onChange={(e) => updateNode({ retryPolicy: e.target.value as any })}
                    >
                      <option value="none">None</option>
                      <option value="1x">1x Retry</option>
                      <option value="3x">3x Retries</option>
                    </Select>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estimated Cost</span>
                      <Badge variant="secondary">~{localNode?.costEstimate || 0} credits</Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DrawerFooter className="border-t">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
