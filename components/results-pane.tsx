"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Copy, Download, AlertCircle, CheckCircle, Loader2, FileDown } from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { UploadedFile } from "@/app/page"

interface ResultsPaneProps {
  files: UploadedFile[]
}

export function ResultsPane({ files }: ResultsPaneProps) {
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const handleCopy = async (text: string, fileId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(fileId)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (error) {
      console.error("Failed to copy text:", error)
    }
  }

  const handleDownload = (fileName: string, summary: string, keywords?: string) => {
    const content = `파일명: ${fileName}\n\n키워드: ${keywords || '없음'}\n\n요약:\n${summary}`
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName.replace(/\.[^/.]+$/, "")}_요약.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadAll = () => {
    const completedFiles = files.filter((file) => file.status === "completed" && file.summary)
    if (completedFiles.length === 0) return

    let allSummaries = ""
    completedFiles.forEach((file, index) => {
      allSummaries += `=== ${file.name} ===\n\n`
      allSummaries += `키워드: ${file.keywords || '없음'}\n\n`
      allSummaries += `요약:\n${file.summary}\n\n`
      if (index < completedFiles.length - 1) {
        allSummaries += "---\n\n"
      }
    })

    const blob = new Blob([allSummaries], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `전체_문서_요약_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const completedFiles = files.filter((file) => file.status === "completed")
  const processingFiles = files.filter((file) => file.status === "processing")
  const errorFiles = files.filter((file) => file.status === "error")

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            요약 결과
          </CardTitle>
          {completedFiles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              className="flex items-center gap-2 bg-transparent"
            >
              <FileDown className="h-4 w-4" />
              전체 다운로드
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                파일을 업로드하고 요약을 생성하면
                <br />
                결과가 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Processing Files */}
              {processingFiles.map((file) => (
                <Card key={file.id} className="border-accent/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      <h3 className="font-medium text-sm truncate">{file.name}</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">AI가 문서를 분석하고 요약을 생성하고 있습니다...</p>
                  </CardContent>
                </Card>
              ))}

              {/* Completed Files */}
              {completedFiles.map((file) => (
                <Card key={file.id} className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <h3 className="font-medium text-sm truncate">{file.name}</h3>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(`키워드: ${file.keywords || '없음'}\n\n요약:\n${file.summary || ""}`, file.id)}
                          className="h-7 w-7 p-0"
                          title="클립보드에 복사"
                        >
                          <Copy className={`h-3 w-3 ${copySuccess === file.id ? "text-green-500" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file.name, file.summary || "", file.keywords)}
                          className="h-7 w-7 p-0"
                          title="개별 다운로드"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {copySuccess === file.id && (
                      <p className="text-xs text-green-500 mt-1">클립보드에 복사되었습니다!</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {file.keywords && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">키워드</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400">{file.keywords}</p>
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">요약</h4>
                      <div className="text-sm leading-relaxed markdown-lists">
                        <ReactMarkdown
                          components={{
                            h1: ({...props}) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                            h2: ({...props}) => <h2 className="text-base font-semibold mt-3 mb-2" {...props} />,
                            h3: ({...props}) => <h3 className="text-sm font-medium mt-2 mb-1" {...props} />,
                            p: ({...props}) => <p className="mb-2" {...props} />,
                            ul: ({...props}) => <ul className="mb-2 ml-4" {...props} />,
                            ol: ({node, ...props}) => {
                              const depth = node?.position?.start.column || 0
                              const level = Math.floor(depth / 4)
                              const listStyles = ['list-decimal', 'list-[lower-alpha]', 'list-[lower-roman]']
                              const listType = listStyles[level % listStyles.length]
                              return <ol className={`mb-2 ml-4 ${listType}`} {...props} />
                            },
                            li: ({...props}) => <li className="mb-1" {...props} />,
                            strong: ({...props}) => <strong className="font-semibold" {...props} />,
                            em: ({...props}) => <em className="italic" {...props} />,
                            code: ({...props}) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs" {...props} />,
                          }}
                        >
                          {file.summary || ""}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Error Files */}
              {errorFiles.map((file) => (
                <Card key={file.id} className="border-destructive/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <h3 className="font-medium text-sm truncate">{file.name}</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-destructive">{file.error}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
