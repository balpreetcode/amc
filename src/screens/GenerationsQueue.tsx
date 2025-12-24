import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Download,
  RefreshCw,
  X,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useDatabase } from "@/contexts/DatabaseContext"
import type { Generation } from "@/types"

export function GenerationsQueue() {
  const { generations } = useDatabase()
  const [generationsList, setGenerationsList] = useState<Generation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [sortField, setSortField] = useState<"createdAt" | "creditsUsed">("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    loadGenerations()
  }, [])

  const loadGenerations = async () => {
    try {
      const data = await generations.getAll()
      setGenerationsList(data)
    } catch (error) {
      console.error('Failed to load generations:', error)
    }
  }

  const filteredGenerations = generationsList
    .filter((gen) => {
      const matchesSearch =
        gen.workflowName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gen.runId.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "All" || gen.status === statusFilter

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1
      }
      return aVal < bVal ? 1 : -1
    })

  const handleSort = (field: "createdAt" | "creditsUsed") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const handleRetry = async (gen: Generation) => {
    try {
      await generations.update(gen.id, { status: "Queued", error: undefined })
      await loadGenerations()
    } catch (error) {
      console.error("Failed to retry generation:", error)
    }
  }

  const handleCancel = async (gen: Generation) => {
    try {
      await generations.update(gen.id, { status: "Failed", error: "Cancelled by user" })
      await loadGenerations()
    } catch (error) {
      console.error("Failed to cancel generation:", error)
    }
  }

  const handleDownload = (gen: Generation) => {
    console.log("Downloading outputs from:", gen.id)
  }

  const toggleRowExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Succeeded":
        return "success"
      case "Running":
        return "warning"
      case "Queued":
        return "secondary"
      case "Failed":
        return "destructive"
      default:
        return "default"
    }
  }

  const stats = {
    total: generationsList.length,
    running: generationsList.filter((g) => g.status === "Running").length,
    succeeded: generationsList.filter((g) => g.status === "Succeeded").length,
    credits: generationsList.reduce((sum, g) => sum + g.creditsUsed, 0),
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Generations</h1>
        <p className="text-muted-foreground">Monitor and manage your workflow runs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Runs</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Running</p>
          <p className="text-2xl font-bold text-yellow-500">
            {stats.running}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Succeeded</p>
          <p className="text-2xl font-bold text-green-500">
            {stats.succeeded}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Credits Used</p>
          <p className="text-2xl font-bold">
            {stats.credits}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by workflow name or run ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-[150px]"
          >
            <option>All Status</option>
            <option>Queued</option>
            <option>Running</option>
            <option>Succeeded</option>
            <option>Failed</option>
          </Select>
        </div>
      </Card>

      {/* Generations Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Run ID</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("createdAt")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Created
                  {sortField === "createdAt" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>Models</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("creditsUsed")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Credits
                  {sortField === "creditsUsed" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>Watermark</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGenerations.map((gen) => (
              <>
                <TableRow key={gen.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="w-8">
                    <button
                      onClick={() => toggleRowExpand(gen.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expandedRow === gen.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{gen.runId}</TableCell>
                  <TableCell className="font-medium">{gen.workflowName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(gen.status)}>{gen.status}</Badge>
                  </TableCell>
                  <TableCell>{gen.createdAt.toLocaleString()}</TableCell>
                  <TableCell>{gen.models.join(", ")}</TableCell>
                  <TableCell>{gen.creditsUsed > 0 ? gen.creditsUsed : "-"}</TableCell>
                  <TableCell>
                    {gen.watermark ? <Badge variant="destructive">On</Badge> : <Badge variant="outline">Off</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {gen.status === "Succeeded" && gen.outputs.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(gen)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {gen.status === "Failed" && gen.retriable && (
                        <Button size="sm" variant="ghost" onClick={() => handleRetry(gen)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {(gen.status === "Queued" || gen.status === "Running") && (
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(gen)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {expandedRow === gen.id && (
                  <TableRow>
                    <TableCell colSpan={9} className="bg-muted/30">
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Inputs</p>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                            {JSON.stringify(gen.inputsSnapshot, null, 2)}
                          </pre>
                        </div>
                        {gen.status === "Failed" && gen.error && (
                          <div>
                            <p className="text-sm font-medium mb-2 text-destructive">Error</p>
                            <p className="text-sm text-destructive">{gen.error}</p>
                          </div>
                        )}
                        {gen.outputs.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Outputs</p>
                            <div className="flex flex-wrap gap-2">
                              {gen.outputs.map((output, i) => (
                                <Badge key={i} variant="secondary">
                                  {output.type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
