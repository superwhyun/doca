"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { MessageSquare, Sparkles, Plus, X } from "lucide-react"
import { SettingsDialog } from "@/components/settings-dialog"

interface PromptPaneProps {
  prompt: string
  onPromptChange: (prompt: string) => void
}

export function PromptPane({
  prompt,
  onPromptChange,
}: PromptPaneProps) {
  const [hasApiKey, setHasApiKey] = useState(false)
  const [presetPrompts, setPresetPrompts] = useState<string[]>([])
  const [newPreset, setNewPreset] = useState("")
  const [isAddingPreset, setIsAddingPreset] = useState(false)

  const defaultPresets = [
    "다음 문서를 간결하고 명확하게 요약해 주세요. 주요 내용과 핵심 포인트를 포함해 주세요.",
    "이 문서의 핵심 아이디어와 결론을 3-5개의 불릿 포인트로 정리해 주세요.",
    "문서의 주요 논점과 근거를 분석하여 요약해 주세요.",
    "이 문서에서 가장 중요한 정보와 실행 가능한 항목들을 추출해 주세요.",
    "문서의 배경, 현재 상황, 그리고 향후 계획을 요약해 주세요.",
  ]

  // Load preset prompts from localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem("prompt-presets")
    if (savedPresets) {
      setPresetPrompts(JSON.parse(savedPresets))
    } else {
      setPresetPrompts(defaultPresets)
      localStorage.setItem("prompt-presets", JSON.stringify(defaultPresets))
    }
  }, [])

  // Check if API key exists in localStorage
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

    // Custom event for same-tab updates
    window.addEventListener("apiKeyUpdate", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("apiKeyUpdate", handleStorageChange)
    }
  }, [])

  const savePresets = (newPresets: string[]) => {
    setPresetPrompts(newPresets)
    localStorage.setItem("prompt-presets", JSON.stringify(newPresets))
  }

  const addPreset = () => {
    if (newPreset.trim() && !presetPrompts.includes(newPreset.trim())) {
      const updatedPresets = [...presetPrompts, newPreset.trim()]
      savePresets(updatedPresets)
      setNewPreset("")
      setIsAddingPreset(false)
    }
  }

  const removePreset = (index: number) => {
    const updatedPresets = presetPrompts.filter((_, i) => i !== index)
    savePresets(updatedPresets)
  }

  const addCurrentPrompt = () => {
    if (prompt.trim() && !presetPrompts.includes(prompt.trim())) {
      const updatedPresets = [...presetPrompts, prompt.trim()]
      savePresets(updatedPresets)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            프롬프트 설정
          </div>
          <SettingsDialog />
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full flex flex-col">
        <div className="flex-1 space-y-4">
          {!hasApiKey && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                AI 요약 기능을 사용하려면 먼저 OpenAI API 키를 설정해 주세요.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium">AI에게 전달할 지시사항</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addCurrentPrompt}
                disabled={!prompt.trim() || presetPrompts.includes(prompt.trim())}
                className="h-6 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                프리셋 추가
              </Button>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="문서를 어떻게 요약하고 싶은지 설명해 주세요..."
              className="min-h-[200px] resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">프리셋 프롬프트</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingPreset(true)}
                className="h-6 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                새 프리셋
              </Button>
            </div>

            {isAddingPreset && (
              <div className="flex gap-2 mb-3">
                <Input
                  value={newPreset}
                  onChange={(e) => setNewPreset(e.target.value)}
                  placeholder="새 프리셋 프롬프트를 입력하세요..."
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addPreset()
                    if (e.key === 'Escape') {
                      setIsAddingPreset(false)
                      setNewPreset("")
                    }
                  }}
                />
                <Button size="sm" onClick={addPreset}>추가</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingPreset(false)
                    setNewPreset("")
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2">
              {presetPrompts.map((preset, index) => (
                <div key={index} className="flex items-center gap-2 group">
                  <button
                    onClick={() => onPromptChange(preset)}
                    className="flex-1 text-left p-3 text-sm rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {preset}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePreset(index)}
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
