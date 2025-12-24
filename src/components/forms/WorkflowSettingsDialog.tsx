import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Workflow, WorkflowVariable, WorkflowOutput } from "@/types"

interface WorkflowSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflow?: Partial<Workflow>
  onSave?: (workflow: Partial<Workflow>) => void
}

const mockTemplates = [
  { id: "t1", name: "Cinematic Video" },
  { id: "t2", name: "Social Media Shorts" },
  { id: "t3", name: "Product Showcase" },
]

export function WorkflowSettingsDialog({ open, onOpenChange, workflow, onSave }: WorkflowSettingsDialogProps) {
  const [formData, setFormData] = useState({
    name: workflow?.name || "",
    basedOnTemplate: workflow?.basedOnTemplate || "",
    inputs: workflow?.inputs || [] as WorkflowVariable[],
    outputs: workflow?.outputs || [
      { id: "o1", type: "final-video", enabled: true },
      { id: "o2", type: "thumbnail", enabled: true },
      { id: "o3", type: "srt", enabled: false },
    ] as WorkflowOutput[],
    defaultModelProfile: workflow?.defaultModelProfile || "Fast",
    watermarkPolicy: workflow?.watermarkPolicy ?? true,
    creditBudgetCap: workflow?.creditBudgetCap || 500,
  })

  const [inputs, setInputs] = useState<WorkflowVariable[]>(formData.inputs)
  const [newInput, setNewInput] = useState({ name: "", type: "text" as const, required: true })

  const handleSave = () => {
    const updatedWorkflow = {
      ...formData,
      inputs,
    }
    onSave?.(updatedWorkflow)
    onOpenChange(false)
  }

  const addInput = () => {
    if (newInput.name.trim()) {
      setInputs([...inputs, { ...newInput }])
      setNewInput({ name: "", type: "text", required: true })
    }
  }

  const removeInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index))
  }

  const toggleOutput = (id: string) => {
    setFormData({
      ...formData,
      outputs: formData.outputs.map((o) =>
        o.id === id ? { ...o, enabled: !o.enabled } : o
      ),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workflow Settings</DialogTitle>
          <DialogDescription>
            Configure global workflow settings, inputs, and outputs
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
            <TabsTrigger value="limits">Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="workflowName">Workflow Name *</Label>
              <Input
                id="workflowName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Script → Video → Captions"
              />
              <p className="text-xs text-muted-foreground">3-80 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Based on Template (optional)</Label>
              <Select
                id="template"
                value={formData.basedOnTemplate}
                onChange={(e) => setFormData({ ...formData, basedOnTemplate: e.target.value })}
              >
                <option value="">None</option>
                {mockTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">Preloads nodes and connections</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelProfile">Default Model Profile</Label>
              <Select
                id="modelProfile"
                value={formData.defaultModelProfile}
                onChange={(e) => setFormData({ ...formData, defaultModelProfile: e.target.value })}
              >
                <option>Fast</option>
                <option>HQ</option>
                <option>Balanced</option>
              </Select>
              <p className="text-xs text-muted-foreground">Applies to nodes unless overridden</p>
            </div>
          </TabsContent>

          <TabsContent value="inputs" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Label>Add Workflow Variables (Inputs)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Variable name"
                  value={newInput.name}
                  onChange={(e) => setNewInput({ ...newInput, name: e.target.value })}
                />
                <Select
                  value={newInput.type}
                  onChange={(e) => setNewInput({ ...newInput, type: e.target.value as any })}
                  className="w-[120px]"
                >
                  <option>text</option>
                  <option>image</option>
                  <option>video</option>
                  <option>audio</option>
                  <option>list</option>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newInput.required}
                    onChange={(e) => setNewInput({ ...newInput, required: e.target.checked })}
                  />
                  Required
                </label>
                <Button onClick={addInput} type="button">Add</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Defined Inputs</Label>
              {inputs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inputs defined yet</p>
              ) : (
                <div className="space-y-2">
                  {inputs.map((input, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <code className="text-sm bg-background px-2 py-1 rounded">
                          {input.name}
                        </code>
                        <Badge variant="outline" className="text-xs">
                          {input.type}
                        </Badge>
                        {input.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInput(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              These variables can be referenced in nodes using <code>{"${variableName}"}</code> syntax
            </p>
          </TabsContent>

          <TabsContent value="outputs" className="space-y-4 mt-4">
            <Label>Publishable Asset Outputs</Label>
            <p className="text-xs text-muted-foreground">Select which assets this workflow should produce</p>

            <div className="space-y-3">
              {formData.outputs.map((output) => (
                <div
                  key={output.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={output.enabled}
                      onChange={() => toggleOutput(output.id)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">
                        {output.type === "final-video" && "Final Video"}
                        {output.type === "thumbnail" && "Thumbnail"}
                        {output.type === "srt" && "SRT Subtitles"}
                        {output.type === "vtt" && "VTT Subtitles"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {output.type === "final-video" && "The main rendered video output"}
                        {output.type === "thumbnail" && "Generated thumbnail image"}
                        {output.type === "srt" && "SubRip subtitle file"}
                        {output.type === "vtt" && "WebVTT subtitle file"}
                      </p>
                    </div>
                  </div>
                  {output.enabled && (
                    <Badge variant="success">Enabled</Badge>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              At least one output must be enabled
            </p>
          </TabsContent>

          <TabsContent value="limits" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base">Watermark Policy</Label>
                <p className="text-sm text-muted-foreground">
                  Free plans include watermarks. Upgrade to remove.
                </p>
              </div>
              <Switch
                checked={formData.watermarkPolicy}
                onCheckedChange={(v) => setFormData({ ...formData, watermarkPolicy: v })}
              />
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <Badge variant={formData.watermarkPolicy ? "destructive" : "success"}>
                {formData.watermarkPolicy ? "Watermark: ON" : "Watermark: OFF"}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditCap">Credit Budget Cap (per run)</Label>
              <Input
                id="creditCap"
                type="number"
                value={formData.creditBudgetCap}
                onChange={(e) => setFormData({ ...formData, creditBudgetCap: parseInt(e.target.value) || 0 })}
                min={0}
                max={10000}
              />
              <p className="text-xs text-muted-foreground">
                If exceeded, the run will halt and prompt for top-up. Set to 0 for no limit.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium mb-2">Credit Pricing</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Text-to-Video: ~100-150 credits</p>
                <p>• Image-to-Video: ~80-120 credits</p>
                <p>• Face Swap: ~50-100 credits</p>
                <p>• Auto Subtitles: ~20-30 credits</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
