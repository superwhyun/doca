"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X, GripVertical } from "lucide-react"
import type { UploadedFile } from "@/app/page"

interface FileUploadPaneProps {
  files: UploadedFile[]
  onFilesUploaded: (files: UploadedFile[]) => void
  onFileReorder: (files: UploadedFile[]) => void
  onFileRemove: (fileId: string) => void
}

export function FileUploadPane({ files, onFilesUploaded, onFileReorder, onFileRemove }: FileUploadPaneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set isDragOver to false if we're leaving the actual drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      const wordFiles = droppedFiles.filter(
        (file) =>
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword" ||
          file.name.endsWith(".docx") ||
          file.name.endsWith(".doc"),
      )

      if (wordFiles.length === 0) {
        alert("Word 파일(.doc, .docx)만 업로드할 수 있습니다.")
        return
      }

      // Check file limit
      const MAX_FILES = 20
      if (files.length + wordFiles.length > MAX_FILES) {
        alert(`최대 ${MAX_FILES}개의 파일까지만 업로드할 수 있습니다. (현재: ${files.length}개)`)
        return
      }

      const newFiles: UploadedFile[] = wordFiles.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        file: file,
        status: "pending" as const,
      }))

      onFilesUploaded(newFiles)
    },
    [onFilesUploaded],
  )


  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || [])
      const wordFiles = selectedFiles.filter(
        (file) =>
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.type === "application/msword" ||
          file.name.endsWith(".docx") ||
          file.name.endsWith(".doc"),
      )

      if (wordFiles.length === 0) {
        alert("Word 파일(.doc, .docx)만 업로드할 수 있습니다.")
        return
      }

      // Check file limit
      const MAX_FILES = 20
      if (files.length + wordFiles.length > MAX_FILES) {
        alert(`최대 ${MAX_FILES}개의 파일까지만 업로드할 수 있습니다. (현재: ${files.length}개)`)
        return
      }

      const newFiles: UploadedFile[] = wordFiles.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        file: file,
        status: "pending" as const,
      }))

      onFilesUploaded(newFiles)
      e.target.value = ""
    },
    [onFilesUploaded],
  )

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
    // Prevent browser from trying to drag the file itself
    e.stopPropagation()
  }, [])

  const handleDragOverItem = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      if (draggedIndex === null || draggedIndex === index) return

      const newFiles = [...files]
      const draggedFile = newFiles[draggedIndex]
      newFiles.splice(draggedIndex, 1)
      newFiles.splice(index, 0, draggedFile)

      onFileReorder(newFiles)
      setDraggedIndex(index)
    },
    [files, draggedIndex, onFileReorder],
  )

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
  }, [])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            파일 업로드
          </div>
          {files.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {files.filter(f => f.status === "completed").length}/{files.length} 완료
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full flex flex-col">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">Word 파일을 여기에 드래그하거나 클릭하여 업로드하세요</p>
          <input
            type="file"
            multiple
            accept=".doc,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            onChange={handleFileInputChange}
            className="hidden"
            id="file-upload"
          />
          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              파일 선택
            </label>
          </Button>
        </div>

        <div className="flex-1 mt-6 space-y-2 overflow-y-auto">
          {files.map((file, index) => (
            <div
              key={file.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOverItem(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-lg border bg-card cursor-move hover:bg-accent/50 transition-colors ${
                file.status === "processing" ? "opacity-50" : ""
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <FileText className="h-4 w-4 text-primary" />
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    file.status === "pending"
                      ? "bg-muted-foreground"
                      : file.status === "processing"
                        ? "bg-blue-500 animate-pulse"
                        : file.status === "completed"
                          ? "bg-green-500"
                          : "bg-red-500"
                  }`}
                />
                <span className={`text-xs ${
                  file.status === "pending"
                    ? "text-muted-foreground"
                    : file.status === "processing"
                      ? "text-blue-600"
                      : file.status === "completed"
                        ? "text-green-600"
                        : "text-red-600"
                }`}>
                  {file.status === "pending" && "대기"}
                  {file.status === "processing" && "처리중"}
                  {file.status === "completed" && "완료"}
                  {file.status === "error" && "오류"}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onFileRemove(file.id)} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
