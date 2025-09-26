"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, X } from "lucide-react"
import { FileUploadPane } from "@/components/file-upload-pane"
import { PromptPane } from "@/components/prompt-pane"
import { ResultsPane } from "@/components/results-pane"

export interface UploadedFile {
  id: string
  name: string
  file: File
  status: "pending" | "processing" | "completed" | "error"
  summary?: string
  keywords?: string
  error?: string
}

export default function Home() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [prompt, setPrompt] = useState(
    "다음 문서를 간결하고 명확하게 요약해 주세요. 문서번호, 제안자, 제안배경, 제안내용으로 bullet으로 나누어서 설명할 것.",
  )
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const handleFilesUploaded = useCallback((newFiles: UploadedFile[]) => {
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleFileReorder = useCallback((reorderedFiles: UploadedFile[]) => {
    setFiles(reorderedFiles)
  }, [])

  const handleFileRemove = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== fileId))
  }, [])

  const handleSummarize = useCallback(async () => {
    if (isProcessing) return

    const apiKey = localStorage.getItem("openai-api-key")
    const pendingFiles = files.filter((file) => file.status === "pending")
    if (pendingFiles.length === 0 || !prompt.trim() || !apiKey) return

    // Limit maximum files per batch
    const MAX_FILES = 20
    if (pendingFiles.length > MAX_FILES) {
      alert(`한 번에 최대 ${MAX_FILES}개의 파일만 처리할 수 있습니다. ${pendingFiles.length - MAX_FILES}개 파일을 제거해주세요.`)
      return
    }

    setIsProcessing(true)
    const controller = new AbortController()
    setAbortController(controller)

    // Process files in concurrent batches
    const BATCH_SIZE = 3 // Process 3 files simultaneously

    const processFile = async (file: UploadedFile) => {
      // Set individual file to processing
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "processing" as const } : f)))

      try {
        const formData = new FormData()
        formData.append('file', file.file)
        formData.append('prompt', prompt)
        formData.append('apiKey', apiKey)

        const response = await fetch("/api/summarize", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("요약 생성에 실패했습니다.")
        }

        const { summary, keywords } = await response.json()

        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "completed" as const, summary, keywords } : f)))
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "pending" as const } : f)))
          return
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
                }
              : f,
          ),
        )
      }
    }

    try {
      // Process files in batches
      for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
        if (controller.signal.aborted) break

        const batch = pendingFiles.slice(i, i + BATCH_SIZE)

        // Process batch concurrently and wait for all to complete
        await Promise.allSettled(batch.map(processFile))
      }
    } finally {
      setIsProcessing(false)
      setAbortController(null)
    }
  }, [files, prompt, isProcessing])

  const handleCancel = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setIsProcessing(false)
      setAbortController(null)

      // Reset processing files back to pending
      setFiles((prev) => prev.map((f) => (f.status === "processing" ? { ...f, status: "pending" as const } : f)))
    }
  }, [abortController])

  // Check for API key and prevent default browser drag and drop behavior
  useEffect(() => {
    const checkApiKey = () => {
      const apiKey = localStorage.getItem("openai-api-key")
      setHasApiKey(apiKey && apiKey.length > 0)
    }

    checkApiKey()

    // Listen for storage changes
    const handleStorageChange = () => {
      checkApiKey()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("apiKeyUpdate", handleStorageChange)

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("apiKeyUpdate", handleStorageChange)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">AI 문서 요약기</h1>
          <p className="text-muted-foreground mt-1">Word 파일을 업로드하고 AI로 요약을 생성하세요</p>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="flex gap-6 h-[calc(100vh-200px)] max-w-none">
          <div className="w-80 flex-shrink-0">
            <FileUploadPane
              files={files}
              onFilesUploaded={handleFilesUploaded}
              onFileReorder={handleFileReorder}
              onFileRemove={handleFileRemove}
            />
          </div>

          <div className="w-96 flex-shrink-0">
            <PromptPane
              prompt={prompt}
              onPromptChange={setPrompt}
            />
          </div>

          <div className="flex flex-col items-center justify-center w-16 gap-2">
            {!isProcessing ? (
              <Button
                onClick={handleSummarize}
                disabled={files.length === 0 || !prompt.trim() || !hasApiKey}
                className={`h-12 w-12 rounded-full p-0 transition-all duration-300 ${
                  files.length === 0
                    ? "bg-muted/50 hover:bg-muted text-muted-foreground shadow-none"
                    : !hasApiKey || !prompt.trim()
                      ? "bg-amber-100 hover:bg-amber-200 text-amber-600 shadow-sm border-amber-200"
                      : "bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105"
                }`}
                size="sm"
              >
                <Sparkles className="h-5 w-5" />
              </Button>
            ) : (
              <>
                <Button
                  disabled
                  className="h-12 w-12 rounded-full p-0 bg-primary/80 animate-pulse shadow-lg"
                  size="sm"
                >
                  <Sparkles className="h-5 w-5 animate-spin" />
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="h-8 w-8 rounded-full p-0 hover:bg-red-50 hover:border-red-200"
                  size="sm"
                >
                  <X className="h-3 w-3 text-red-600" />
                </Button>
              </>
            )}
          </div>

          <div className="flex-1">
            <ResultsPane files={files} />
          </div>
        </div>
      </main>
    </div>
  )
}
