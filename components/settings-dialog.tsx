"use client"

import { useState, useEffect } from "react"
import { Settings, Eye, EyeOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function SettingsDialog() {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Load API key from localStorage on component mount
  useEffect(() => {
    setIsClient(true)
    const storedApiKey = localStorage.getItem("openai-api-key")
    if (storedApiKey) {
      setApiKey(storedApiKey)
      setHasApiKey(true)
    } else {
      setHasApiKey(false)
    }
  }, [])

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("openai-api-key", apiKey.trim())
      setHasApiKey(true)
    } else {
      localStorage.removeItem("openai-api-key")
      setHasApiKey(false)
    }
    // Trigger custom event for same-tab updates
    window.dispatchEvent(new Event("apiKeyUpdate"))
    setIsOpen(false)
  }

  const handleCancel = () => {
    // Reset to stored value if user cancels
    const storedApiKey = localStorage.getItem("openai-api-key") || ""
    setApiKey(storedApiKey)
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 ${
          isClient && hasApiKey ? "border-green-500 text-green-700" : "border-red-500 text-red-700"
        }`}
      >
        <Settings className="w-4 h-4" />
        설정
        {isClient && hasApiKey && (
          <span className="w-2 h-2 bg-green-500 rounded-full" />
        )}
      </Button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-lg shadow-xl border">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">API 설정</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            OpenAI API 키를 설정하세요. 이 키는 브라우저에 안전하게 저장됩니다.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium block">API Key</label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            OpenAI API 키는 sk-로 시작하는 문자열입니다.
            <br />
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              OpenAI 플랫폼에서 API 키 생성
            </a>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </div>
      </div>
    </>
  )
}