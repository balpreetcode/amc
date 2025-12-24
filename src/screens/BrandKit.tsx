import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Palette, Type, Image as ImageIcon } from "lucide-react"
import { useDatabase } from "@/contexts/DatabaseContext"
import type { BrandPreset } from "@/types"

export function BrandKit() {
  const { brandPresets } = useDatabase()
  const [presets, setPresets] = useState<BrandPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<BrandPreset | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPreset, setEditingPreset] = useState<BrandPreset>({
    id: "",
    name: "",
    fonts: { primary: "Inter", secondary: "Inter" },
    colors: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#ec4899" },
    captionStyles: {
      fontFamily: "Inter",
      fontSize: 24,
      textColor: "#ffffff",
    },
  })

  useEffect(() => {
    loadPresets()
  }, [])

  const loadPresets = async () => {
    try {
      const data = await brandPresets.getAll()
      setPresets(data)
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  const handleSavePreset = async () => {
    try {
      if (editingPreset.id) {
        await brandPresets.update(editingPreset.id, editingPreset)
        setPresets(presets.map((p) => (p.id === editingPreset.id ? editingPreset : p)))
      } else {
        const newPreset = await brandPresets.create(editingPreset as any)
        setPresets([...presets, newPreset])
      }
      setIsEditing(false)
      setShowCreateDialog(false)
      setSelectedPreset(editingPreset)
    } catch (error) {
      console.error('Failed to save preset:', error)
    }
  }

  const handleDeletePreset = async (id: string) => {
    try {
      await brandPresets.delete(id)
      setPresets(presets.filter((p) => p.id !== id))
      if (selectedPreset?.id === id) {
        setSelectedPreset(null)
      }
    } catch (error) {
      console.error('Failed to delete preset:', error)
    }
  }

  const handleStartEdit = (preset: BrandPreset) => {
    setEditingPreset(preset)
    setIsEditing(true)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Brand Kit</h1>
          <p className="text-muted-foreground">Reusable styling presets for consistent branding</p>
        </div>
        <Button onClick={() => {
          setEditingPreset({
            id: "",
            name: "",
            fonts: { primary: "Inter", secondary: "Inter" },
            colors: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#ec4899" },
            captionStyles: {
              fontFamily: "Inter",
              fontSize: 24,
              textColor: "#ffffff",
            },
          })
          setShowCreateDialog(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Preset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presets List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold text-lg">Your Presets</h2>
          {presets.map((preset) => (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-all ${
                selectedPreset?.id === preset.id ? "ring-2 ring-primary" : "hover:shadow-md"
              }`}
              onClick={() => setSelectedPreset(preset)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{preset.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit(preset)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePreset(preset.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: preset.colors.primary }}
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: preset.colors.secondary }}
                  />
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ backgroundColor: preset.colors.accent }}
                  />
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {preset.fonts.primary}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preset Details */}
        <div className="lg:col-span-2">
          {selectedPreset ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedPreset.name}</CardTitle>
                    <CardDescription>Configure your brand styling</CardDescription>
                  </div>
                  <Button onClick={() => handleStartEdit(selectedPreset)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                {selectedPreset.logo && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Logo
                    </Label>
                    <div className="w-32 h-16 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Logo preview</span>
                    </div>
                  </div>
                )}

                {/* Colors */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Colors
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Primary</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: selectedPreset.colors.primary }}
                        />
                        <span className="text-sm font-mono">{selectedPreset.colors.primary}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Secondary</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: selectedPreset.colors.secondary }}
                        />
                        <span className="text-sm font-mono">{selectedPreset.colors.secondary}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Accent</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: selectedPreset.colors.accent }}
                        />
                        <span className="text-sm font-mono">{selectedPreset.colors.accent}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fonts */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Fonts
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Primary</Label>
                      <p
                        className="mt-1 text-lg"
                        style={{ fontFamily: selectedPreset.fonts.primary }}
                      >
                        {selectedPreset.fonts.primary}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Secondary</Label>
                      <p
                        className="mt-1 text-lg"
                        style={{ fontFamily: selectedPreset.fonts.secondary }}
                      >
                        {selectedPreset.fonts.secondary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Caption Styles */}
                <div className="space-y-3">
                  <Label>Caption Styles</Label>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <p
                      className="text-center py-2"
                      style={{
                        fontFamily: selectedPreset.captionStyles.fontFamily,
                        fontSize: `${selectedPreset.captionStyles.fontSize}px`,
                        color: selectedPreset.captionStyles.textColor,
                        backgroundColor: selectedPreset.captionStyles.backgroundColor,
                      }}
                    >
                      Sample Caption Text
                    </p>
                  </div>
                </div>

                {/* Outro */}
                {selectedPreset.outro && (
                  <div className="space-y-2">
                    <Label>Default Outro</Label>
                    <p className="text-sm text-muted-foreground">{selectedPreset.outro}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center text-muted-foreground">
                  <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a preset</p>
                  <p className="text-sm">Or create a new one to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit/Create Dialog */}
      {(isEditing || showCreateDialog) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => {
            setIsEditing(false)
            setShowCreateDialog(false)
          }} />
          <div className="relative z-50 w-full max-w-lg bg-background border rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {isEditing ? "Edit Preset" : "New Brand Preset"}
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Preset Name</Label>
                <Input
                  value={editingPreset.name}
                  onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  placeholder="My Brand Preset"
                />
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="border border-input rounded-md p-3 flex items-center gap-3 relative overflow-hidden">
                   <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                         setEditingPreset({ ...editingPreset, logo: file.name })
                      }
                    }}
                  />
                  <div className="bg-muted w-10 h-10 rounded flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {editingPreset.logo || "Upload logo..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {editingPreset.logo ? "Click to change" : "Click to upload"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Colors</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Primary</Label>
                    <Input
                      type="color"
                      value={editingPreset.colors.primary}
                      onChange={(e) => setEditingPreset({
                        ...editingPreset,
                        colors: { ...editingPreset.colors, primary: e.target.value }
                      })}
                      className="h-10 w-full p-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Secondary</Label>
                    <Input
                      type="color"
                      value={editingPreset.colors.secondary}
                      onChange={(e) => setEditingPreset({
                        ...editingPreset,
                        colors: { ...editingPreset.colors, secondary: e.target.value }
                      })}
                      className="h-10 w-full p-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Accent</Label>
                    <Input
                      type="color"
                      value={editingPreset.colors.accent}
                      onChange={(e) => setEditingPreset({
                        ...editingPreset,
                        colors: { ...editingPreset.colors, accent: e.target.value }
                      })}
                      className="h-10 w-full p-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Font</Label>
                  <Select
                    value={editingPreset.fonts.primary}
                    onChange={(e) => setEditingPreset({
                      ...editingPreset,
                      fonts: { ...editingPreset.fonts, primary: e.target.value }
                    })}
                  >
                    <option>Inter</option>
                    <option>Roboto</option>
                    <option>SF Pro</option>
                    <option>Open Sans</option>
                    <option>Montserrat</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Font</Label>
                  <Select
                    value={editingPreset.fonts.secondary}
                    onChange={(e) => setEditingPreset({
                      ...editingPreset,
                      fonts: { ...editingPreset.fonts, secondary: e.target.value }
                    })}
                  >
                    <option>Inter</option>
                    <option>Roboto</option>
                    <option>SF Pro</option>
                    <option>Open Sans</option>
                    <option>Montserrat</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Caption Styles</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Font Family</Label>
                    <Select
                      value={editingPreset.captionStyles.fontFamily}
                      onChange={(e) => setEditingPreset({
                        ...editingPreset,
                        captionStyles: { ...editingPreset.captionStyles, fontFamily: e.target.value }
                      })}
                    >
                      <option>Inter</option>
                      <option>Roboto</option>
                      <option>Open Sans</option>
                      <option>Montserrat</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Font Size</Label>
                    <Input
                      type="number"
                      value={editingPreset.captionStyles.fontSize}
                      onChange={(e) => setEditingPreset({
                        ...editingPreset,
                        captionStyles: { ...editingPreset.captionStyles, fontSize: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Text Color</Label>
                    <Input
                      type="color"
                      value={editingPreset.captionStyles.textColor}
                      onChange={(e) => setEditingPreset({
                        ...editingPreset,
                        captionStyles: { ...editingPreset.captionStyles, textColor: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Background Color</Label>
                    <Input
                      type="color"
                      value={editingPreset.captionStyles.backgroundColor || "#000000"}
                      onChange={(e) => setEditingPreset({
                        ...editingPreset,
                        captionStyles: { ...editingPreset.captionStyles, backgroundColor: e.target.value }
                      })}
                      className="h-10 p-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Default Outro Message</Label>
                <Textarea
                  value={editingPreset.outro || ""}
                  onChange={(e) => setEditingPreset({ ...editingPreset, outro: e.target.value })}
                  placeholder="Subscribe for more content!"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsEditing(false)
                  setShowCreateDialog(false)
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSavePreset}>Save Preset</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
