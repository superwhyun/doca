import * as mammoth from 'mammoth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let uploadedFileId: string | null = null
  let apiKey: string | null = null
  
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const prompt = formData.get('prompt') as string
    apiKey = formData.get('apiKey') as string

    if (!file || !prompt) {
      return Response.json({ error: "파일과 프롬프트가 필요합니다." }, { status: 400 })
    }

    if (!apiKey) {
      return Response.json({ error: "OpenAI API 키가 필요합니다." }, { status: 400 })
    }

    // Prepare model and prompt
    const model = process.env.OPENAI_MODEL || "gpt-5"
    const fileName = (file as any).name || 'upload'
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const inputText = `요청 ID: ${requestId}
파일명: ${fileName}

다음 업로드된 파일 "${fileName}"을 분석하여 요약하고 키워드를 추출해줘.
결과는 반드시 JSON으로, 'summary'와 'keywords' 두 키를 포함해야 해.
예시:
{
  "summary": "여기에 요약",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"]
}

사용자 지시사항: ${prompt}`

    // Decide handling based on file extension
    const name = (file as any).name || 'upload'
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : ''

    let requestBody: any

    if (ext === 'pdf') {
      // Upload PDF for context stuffing and reference via input_file
      const fileFormData = new FormData()
      fileFormData.append('purpose', 'user_data')
      fileFormData.append('file', file)

      const fileUploadResponse = await fetch("https://api.openai.com/v1/files", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
        body: fileFormData,
      })

      if (!fileUploadResponse.ok) {
        const errorData = await fileUploadResponse.json().catch(() => ({}))
        return Response.json({ error: "파일 업로드에 실패했습니다." }, { status: 500 })
      }

      const fileData = await fileUploadResponse.json()
      const fileId = fileData.id
      uploadedFileId = fileId

      requestBody = {
        model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: inputText },
              { type: 'input_file', file_id: fileId },
            ],
          },
        ],
      }
    } else if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json') {
      // For plaintext-like formats, inline as input_text
      const textContent = await (file as any).text?.() ?? new TextDecoder().decode(new Uint8Array(await (file as any).arrayBuffer()))
      const truncated = textContent.length > 150_000 ? textContent.slice(0, 150_000) + `\n...[truncated ${textContent.length - 150_000} chars]` : textContent
      requestBody = {
        model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: `${inputText}\n\n문서 내용 시작:\n${truncated}` },
            ],
          },
        ],
      }
    } else if (ext === 'docx') {
      // Extract final text only from DOCX via Mammoth and inline as input_text
      // Create a fresh buffer for each processing to avoid stream consumption issues
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      console.log(`Processing docx file: ${name}, buffer size: ${buffer.length}`)
      
      const { value: docxText = '' } = await mammoth.extractRawText({ buffer })
      const textContent = docxText.trim()
      
      console.log(`Extracted text length: ${textContent.length}, first 100 chars: ${textContent.substring(0, 100)}`)
      
      const truncated = textContent.length > 150_000
        ? textContent.slice(0, 150_000) + `\n...[truncated ${textContent.length - 150_000} chars]`
        : textContent
      requestBody = {
        model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: `${inputText}\n\n문서 내용 시작:\n${truncated}` },
            ],
          },
        ],
      }
    } else {
      // Unsupported formats
      return Response.json({
        error: `지원하지 않는 파일 형식입니다: .${ext || 'unknown'}. PDF(.pdf), Word(.docx), 텍스트 파일(txt/md/csv/json)만 지원합니다.`,
      }, { status: 400 })
    }
    if (model.startsWith('gpt-5')) {
      requestBody.reasoning = { effort: 'low' }
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      // Clean up uploaded file on error
      if (uploadedFileId) {
        try {
          await fetch(`https://api.openai.com/v1/files/${uploadedFileId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${apiKey}` },
          })
        } catch (deleteError) {
          console.warn(`Failed to delete uploaded file ${uploadedFileId}:`, deleteError)
        }
      }

      const errorData = await response.json().catch(() => ({}))

      if (response.status === 401) {
        return Response.json({ error: "유효하지 않은 API 키입니다." }, { status: 401 })
      }

      if (response.status === 404) {
        return Response.json({ error: `요청한 모델을 찾을 수 없습니다. 모델: ${model}` }, { status: 404 })
      }

      // Surface helpful hint if API complains about parameters
      const hint = errorData?.error?.param
        ? `요청 파라미터 오류: ${errorData.error.param}. 최신 Responses 입력 스키마(structured input: input_text + input_file)를 사용합니다.`
        : undefined
      return Response.json({ error: errorData?.error?.message || "API 요청 중 오류가 발생했습니다.", hint }, { status: response.status })
    }

    const data = await response.json()

    // Clean up uploaded file if it exists
    if (uploadedFileId) {
      try {
        await fetch(`https://api.openai.com/v1/files/${uploadedFileId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${apiKey}` },
        })
      } catch (deleteError) {
        // Log but don't fail the request if file deletion fails
        console.warn(`Failed to delete uploaded file ${uploadedFileId}:`, deleteError)
      }
    }

    // Prefer convenience field; fallback to common shapes
    let resultText: string | undefined = data.output_text
    if (!resultText) {
      try {
        // Find the message output in the array
        const messageOutput = data?.output?.find((item: any) => item.type === 'message')
        if (messageOutput?.content?.[0]) {
          // Try different content structures
          resultText = messageOutput.content[0].text || messageOutput.content[0].text?.value
        }

        // Fallback to first output if no message type found
        if (!resultText && data?.output?.[0]?.content?.[0]) {
          resultText = data.output[0].content[0].text || data.output[0].content[0].text?.value
        }
      } catch (_) {
        // ignore
      }
    }

    if (!resultText || typeof resultText !== 'string') {
      throw new Error("요약을 생성할 수 없습니다.")
    }

    // JSON 블록 추출 및 파싱
    try {
      const jsonMatch = resultText.match(/\{[^{}]*\}/)

      if (jsonMatch) {
        const jsonString = jsonMatch[0]
        const parsedData = JSON.parse(jsonString)

        let summary = parsedData.summary || "요약 실패"
        if (Array.isArray(summary)) {
          summary = summary.join("\n")
        }

        const keywords = Array.isArray(parsedData.keywords)
          ? parsedData.keywords.join(", ")
          : (parsedData.keywords || "키워드 추출 실패")

        return Response.json({
          summary: summary.trim(),
          keywords: keywords.trim()
        })
      } else {
        // JSON 블록을 찾지 못한 경우
        const summary = resultText.length > 300
          ? resultText.substring(0, 300) + "..."
          : resultText

        return Response.json({
          summary: summary.trim(),
          keywords: "키워드 추출 실패"
        })
      }
    } catch (parseError) {
      return Response.json({
        summary: resultText.trim(),
        keywords: "키워드 추출 실패"
      })
    }
  } catch (error) {
    // Clean up uploaded file on error
    if (uploadedFileId) {
      try {
        await fetch(`https://api.openai.com/v1/files/${uploadedFileId}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${apiKey}` },
        })
      } catch (deleteError) {
        console.warn(`Failed to delete uploaded file ${uploadedFileId}:`, deleteError)
      }
    }
    return Response.json({ error: "요약 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
}
