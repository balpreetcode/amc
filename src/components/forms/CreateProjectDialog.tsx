import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { ChipInput } from "@/components/ui/chip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import type { Project, ContentType, AspectRatio, Language, Platform } from "@/types"

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (project: Partial<Project>) => void
  templateId?: string
}

export function CreateProjectDialog({ open, onOpenChange, onSubmit, templateId }: CreateProjectDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contentType: "video" as ContentType,
    defaultAspectRatio: "9:16" as AspectRatio,
    defaultDuration: 30,
    primaryLanguage: "English" as Language,
    targetPlatforms: [] as Platform[],
    brandPreset: "",
    tags: [] as string[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Project name is required"
    } else if (formData.name.length < 3 || formData.name.length > 60) {
      newErrors.name = "Project name must be between 3-60 characters"
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters"
    }

    if (formData.tags.length > 10) {
      newErrors.tags = "Maximum 10 tags allowed"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      setFormData({
        name: "",
        description: "",
        contentType: "video",
        defaultAspectRatio: "9:16",
        defaultDuration: 30,
        primaryLanguage: "English",
        targetPlatforms: [],
        brandPreset: "",
        tags: [],
      })
    }
  }

  const handlePlatformToggle = (platform: Platform) => {
    setFormData({
      ...formData,
      targetPlatforms: formData.targetPlatforms.includes(platform)
        ? formData.targetPlatforms.filter((p) => p !== platform)
        : [...formData.targetPlatforms, platform],
    })
  }

  const platforms: Platform[] = ["YouTube Shorts", "TikTok", "Instagram Reels", "Twitter"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up your content creation project with default settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Daily AI Shorts"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of your project..."
              rows={3}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Content Type */}
            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type *</Label>
              <Select
                id="contentType"
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value as ContentType })}
              >
                <option>Video</option>
                <option>Image</option>
                <option>Audio</option>
                <option>Workflow-only</option>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label htmlFor="aspectRatio">Default Aspect Ratio *</Label>
              <Select
                id="aspectRatio"
                value={formData.defaultAspectRatio}
                onChange={(e) => setFormData({ ...formData, defaultAspectRatio: e.target.value as AspectRatio })}
              >
                <option>9:16</option>
                <option>1:1</option>
                <option>16:9</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Default Duration (seconds) *</Label>
              <Input
                id="duration"
                type="number"
                value={formData.defaultDuration}
                onChange={(e) => setFormData({ ...formData, defaultDuration: parseInt(e.target.value) || 1 })}
                min={1}
                max={60}
              />
              <p className="text-xs text-muted-foreground">1-60 seconds supported</p>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language">Primary Language *</Label>
              <Select
                id="language"
                value={formData.primaryLanguage}
                onChange={(e) => setFormData({ ...formData, primaryLanguage: e.target.value as Language })}
              >
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
                <option>Chinese</option>
                <option>Japanese</option>
              </Select>
            </div>
          </div>

          {/* Target Platforms */}
          <div className="space-y-2">
            <Label>Target Platforms</Label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => handlePlatformToggle(platform)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    formData.targetPlatforms.includes(platform)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Preset */}
          <div className="space-y-2">
            <Label htmlFor="brandPreset">Brand Preset (optional)</Label>
            <Select
              id="brandPreset"
              value={formData.brandPreset}
              onChange={(e) => setFormData({ ...formData, brandPreset: e.target.value })}
            >
              <option value="">None</option>
              <option>Brand Kit A</option>
              <option>Minimal Brand</option>
            </Select>
            <p className="text-xs text-muted-foreground">Applied to captions, thumbnails, and outros</p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <ChipInput
              values={formData.tags}
              onChange={(tags) => setFormData({ ...formData, tags })}
              placeholder="Add tags..."
            />
            {errors.tags && <p className="text-sm text-destructive">{errors.tags}</p>}
            <p className="text-xs text-muted-foreground">{formData.tags.length}/10 tags</p>
          </div>

          {/* Template indicator */}
          {templateId && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                Creating from template: <span className="font-medium">Template ID: {templateId}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
