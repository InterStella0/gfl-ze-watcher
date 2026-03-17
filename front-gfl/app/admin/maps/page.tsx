"use client"

import { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'components/ui/table'
import { Button } from 'components/ui/button'
import { Input } from 'components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'components/ui/dialog'
import { Badge } from 'components/ui/badge'
import { Progress } from 'components/ui/progress'
import { toast } from 'sonner'
import { Upload, Trash2, Search } from 'lucide-react'
import { fetchApiUrl } from 'utils/generalUtils'
import { Tabs, TabsList, TabsTrigger } from 'components/ui/tabs'
import { uploadFileChunked, CHUNKED_UPLOAD_THRESHOLD, UploadProgress } from 'utils/uploadUtils'

interface Map3DModel {
  id: number
  map_name: string
  res_type: string
  credit: string | null
  link_path: string
  uploaded_by: number | null
  uploader_name: string | null
  file_size: number
  created_at: Date
  updated_at: Date
}

interface MapWithModels {
  map_name: string
  low_res_model: Map3DModel | null
  high_res_model: Map3DModel | null
}

export default function AdminMapsPage() {
  const [maps, setMaps] = useState<MapWithModels[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMap, setSelectedMap] = useState<MapWithModels | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  const fetchMaps = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchApiUrl<MapWithModels[]>('/maps/all/3d')
      setMaps(data)
    } catch (error) {
      toast.error('Failed to load maps')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMaps()
  }, [fetchMaps])

  const handleManageClick = (map: MapWithModels) => {
    setSelectedMap(map)
    setUploadDialogOpen(true)
  }

  const handleDelete = async (mapName: string, resType: 'low' | 'high') => {
    if (!confirm(`Delete ${resType}-res model for ${mapName}?`)) return

    try {
      await fetchApiUrl(`/maps/${mapName}/3d/${resType}`, {
        method: 'DELETE',
      })
      toast.success(`${resType}-res model deleted`)
      fetchMaps()
    } catch (error) {
      toast.error('Failed to delete model')
    }
  }

  const filteredMaps = maps.filter(m =>
    m.map_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Map 3D Model Management</h1>
        <p className="text-muted-foreground">
          Upload and manage 3D models (.glb files) for maps
        </p>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search maps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Map Name</TableHead>
              <TableHead>Low-Res</TableHead>
              <TableHead>High-Res</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredMaps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No maps found
                </TableCell>
              </TableRow>
            ) : (
              filteredMaps.map((map) => (
                <MapRow
                  key={map.map_name}
                  map={map}
                  onManage={handleManageClick}
                  onDelete={handleDelete}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedMap && (
        <ManageModelsDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          map={selectedMap}
          onSuccess={() => {
            fetchMaps()
            setUploadDialogOpen(false)
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function MapRow({
  map,
  onManage,
  onDelete,
}: {
  map: MapWithModels
  onManage: (map: MapWithModels) => void
  onDelete: (mapName: string, resType: 'low' | 'high') => void
}) {
  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{map.map_name}</TableCell>
      <TableCell>
        {map.low_res_model ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {formatFileSize(map.low_res_model.file_size)}
            </Badge>
            {map.low_res_model.credit && (
              <span className="text-sm text-muted-foreground">
                {map.low_res_model.credit}
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">None</span>
        )}
      </TableCell>
      <TableCell>
        {map.high_res_model ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {formatFileSize(map.high_res_model.file_size)}
            </Badge>
            {map.high_res_model.credit && (
              <span className="text-sm text-muted-foreground">
                {map.high_res_model.credit}
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">None</span>
        )}
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onManage(map)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Manage
        </Button>
      </TableCell>
    </TableRow>
  )
}

function ManageModelsDialog({
  open,
  onOpenChange,
  map,
  onSuccess,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  map: MapWithModels
  onSuccess: () => void
  onDelete: (mapName: string, resType: 'low' | 'high') => void
}) {
  const [resType, setResType] = useState<'low' | 'high'>('low')
  const [file, setFile] = useState<File | null>(null)
  const [credit, setCredit] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const currentModel = resType === 'low' ? map.low_res_model : map.high_res_model

  useEffect(() => {
    if (open) {
      setFile(null)
      setCredit(currentModel?.credit || '')
      setUploadProgress(null)
      setAbortController(null)
    }
  }, [open, resType, currentModel])

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a file')
      return
    }

    if (!file.name.endsWith('.glb')) {
      toast.error('File must be a .glb file')
      return
    }

    setUploading(true)
    setUploadProgress(null)

    try {
      if (file.size > CHUNKED_UPLOAD_THRESHOLD) {
        // Chunked upload path for large files
        const controller = new AbortController()
        setAbortController(controller)

        await uploadFileChunked({
          mapName: map.map_name,
          file,
          resType,
          credit: credit.trim() || undefined,
          signal: controller.signal,
          onProgress: (progress) => setUploadProgress(progress),
          onError: (error, chunkIndex) => {
            console.error(`Upload error${chunkIndex !== undefined ? ` at chunk ${chunkIndex}` : ''}:`, error)
          },
        })
      } else {
        // Existing single-shot upload for smaller files
        const formData = new FormData()
        formData.append('file', file)
        formData.append('res_type', resType)
        if (credit.trim()) {
          formData.append('credit', credit.trim())
        }

        await fetchApiUrl(`/maps/${map.map_name}/3d/upload`, {
          method: 'POST',
          body: formData,
        })
      }

      toast.success(`${resType}-res model uploaded successfully`)
      onSuccess()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.info('Upload cancelled')
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        toast.error(`Failed to upload model: ${errorMessage}`)
      }
    } finally {
      setUploading(false)
      setUploadProgress(null)
      setAbortController(null)
    }
  }

  const handleCancelUpload = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  const handleDeleteModel = async () => {
    if (!currentModel) return
    onOpenChange(false)
    await onDelete(map.map_name, resType)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Models - {map.map_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Resolution Type</label>
            <Tabs value={resType} onValueChange={(v) => setResType(v as 'low' | 'high')} className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="low">
                  Low-Res
                  {map.low_res_model && (
                    <Badge variant="secondary" className="ml-2">
                      {(map.low_res_model.file_size / (1024 * 1024)).toFixed(1)} MB
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="high">
                  High-Res
                  {map.high_res_model && (
                    <Badge variant="secondary" className="ml-2">
                      {(map.high_res_model.file_size / (1024 * 1024)).toFixed(1)} MB
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {currentModel && (
            <div className="p-3 border rounded-md bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Model</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(currentModel.file_size / (1024 * 1024)).toFixed(1)} MB
                    {currentModel.credit && ` • ${currentModel.credit}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteModel}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">
              Upload New .glb File {currentModel && '(will replace existing)'}
            </label>
            <Input
              type="file"
              accept=".glb"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Credit (Optional)</label>
            <Input
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              placeholder="Author or source credit"
              className="mt-1"
            />
          </div>

          {uploading && uploadProgress && (
            <div className="space-y-2 p-3 border rounded-md bg-muted/50">
              <div className="flex justify-between text-sm">
                <span>Uploading chunk {uploadProgress.currentChunk + 1} of {uploadProgress.totalChunks}</span>
                <span>{uploadProgress.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={uploadProgress.percentage} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {(uploadProgress.bytesUploaded / (1024 * 1024)).toFixed(1)} MB / {(uploadProgress.totalBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelUpload}
                  className="h-6 px-2"
                >
                  Cancel Upload
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={uploading || !file}>
              {uploading ? 'Uploading...' : currentModel ? 'Replace' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
