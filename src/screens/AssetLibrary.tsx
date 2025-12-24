import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { ChipInput } from "@/components/ui/chip"
import {
  Search,
  Upload,
  Grid3x3,
  List,
  Image,
  Video,
  Music,
  FileText,
  MoreVertical,
  Trash2,
  Edit,
  Download,
} from "lucide-react"
import { useDatabase } from "@/contexts/DatabaseContext"
import type { Asset, AssetType, SourceRights } from "@/types"

const assetTypes: { value: AssetType; label: string; icon: React.ElementType }[] = [
  { value: "Video", label: "Videos", icon: Video },
  { value: "Image", label: "Images", icon: Image },
  { value: "Audio", label: "Audio", icon: Music },
  { value: "Subtitle", label: "Subtitles", icon: FileText },
  { value: "Doc", label: "Documents", icon: FileText },
]

export function AssetLibrary() {
  const { assets } = useDatabase()
  const [assetList, setAssetList] = useState<Asset[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"All" | AssetType>("All")
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [newAsset, setNewAsset] = useState({
    title: "",
    file: "",
    assetType: "Video" as AssetType,
    tags: [] as string[],
    sourceRights: "Owned" as SourceRights,
    licenseInfo: "",
    notes: "",
  })

  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    try {
      const data = await assets.getAll()
      setAssetList(data)
    } catch (error) {
      console.error('Failed to load assets:', error)
    }
  }

  const filteredAssets = assetList.filter((asset) => {
    const matchesSearch =
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.file.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = typeFilter === "All" || asset.assetType === typeFilter

    const matchesTags =
      tagFilter.length === 0 || tagFilter.some((tag) => asset.tags.includes(tag))

    return matchesSearch && matchesType && matchesTags
  })

  const handleUploadAsset = async () => {
    try {
      if (!newAsset.file) return // basic validation
      await assets.create(newAsset as any)
      setUploadDialogOpen(false)
      setNewAsset({
        title: "",
        file: "",
        assetType: "Video",
        tags: [],
        sourceRights: "Owned",
        licenseInfo: "",
        notes: "",
      })
      await loadAssets()
    } catch (error) {
      console.error('Failed to upload asset:', error)
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await assets.delete(assetId)
      await loadAssets()
    } catch (error) {
      console.error('Failed to delete asset:', error)
    }
  }

  const getAssetIcon = (type: AssetType) => {
    const assetType = assetTypes.find((t) => t.value === type)
    const Icon = assetType?.icon || FileText
    return <Icon className="h-6 w-6" />
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Asset Library</h1>
          <p className="text-muted-foreground">Manage reusable materials for your projects</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Asset
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="w-[150px]"
              >
                <option>All Types</option>
                {assetTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Filter by tags:</label>
            <ChipInput
              values={tagFilter}
              onChange={setTagFilter}
              placeholder="Add tags to filter..."
            />
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredAssets.length}</span> of{" "}
          <span className="font-medium text-foreground">{assetList.length}</span> assets
        </div>
        <div className="flex gap-2">
          {assetTypes.map((type) => {
            const Icon = type.icon
            const count = assetList.filter((a) => a.assetType === type.value).length
            return (
              <Badge key={type.value} variant="outline" className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {type.label}: {count}
              </Badge>
            )
          })}
        </div>
      </div>

      {/* Assets Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground">
                {getAssetIcon(asset.assetType)}
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1">{asset.title}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="text-xs line-clamp-1">{asset.file}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {asset.assetType}
                  </Badge>
                  {asset.sourceRights === "Licensed" && (
                    <Badge variant="outline" className="text-xs">
                      Licensed
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {asset.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {asset.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{asset.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-muted-foreground">
                  {getAssetIcon(asset.assetType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{asset.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{asset.file}</p>
                </div>
                <Badge variant="secondary">{asset.assetType}</Badge>
                <div className="flex gap-1">
                  {asset.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAsset(asset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No assets found matching your criteria.</p>
        </div>
      )}

      {/* Upload Dialog */}
      {uploadDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setUploadDialogOpen(false)} />
          <div className="relative z-50 w-full max-w-lg bg-background border rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Upload Asset</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">File</label>
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
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newAsset.title}
                  onChange={(e) => setNewAsset({ ...newAsset, title: e.target.value })}
                  placeholder="Asset title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Asset Type</label>
                <Select
                  value={newAsset.assetType}
                  onChange={(e) => setNewAsset({ ...newAsset, assetType: e.target.value as AssetType })}
                >
                  {assetTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <ChipInput
                  values={newAsset.tags}
                  onChange={(tags) => setNewAsset({ ...newAsset, tags })}
                  placeholder="Add tags..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Source / Rights</label>
                <Select
                  value={newAsset.sourceRights}
                  onChange={(e) => setNewAsset({ ...newAsset, sourceRights: e.target.value as SourceRights })}
                >
                  <option>Owned</option>
                  <option>Licensed</option>
                </Select>
              </div>

              {newAsset.sourceRights === "Licensed" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">License Info</label>
                  <Input
                    value={newAsset.licenseInfo}
                    onChange={(e) => setNewAsset({ ...newAsset, licenseInfo: e.target.value })}
                    placeholder="License details"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={newAsset.notes}
                  onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
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
