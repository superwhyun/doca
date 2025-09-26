import mammoth from 'mammoth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const prompt = formData.get('prompt') as string
    const apiKey = formData.get('apiKey') as string

    if (!file || !prompt) {
      return Response.json({ error: "파일과 프롬프트가 필요합니다." }, { status: 400 })
    }

    if (!apiKey) {
      return Response.json({ error: "OpenAI API 키가 필요합니다." }, { status: 400 })
    }

    // Prepare model and prompt
    const model = process.env.OPENAI_MODEL || "gpt-5"
    const inputText = `다음 업로드된 파일을 분석하여 요약하고 키워드를 추출해줘.
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
      console.log(`[DEBUG] PDF 업로드 시작: ${name}, 크기: ${file.size}bytes`)

      const fileFormData = new FormData()
      fileFormData.append('purpose', 'user_data')
      fileFormData.append('file', file)

      const fileUploadResponse = await fetch("https://api.openai.com/v1/files", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
        body: fileFormData,
      })

      console.log(`[DEBUG] 파일 업로드 응답 상태: ${fileUploadResponse.status}`)
      if (!fileUploadResponse.ok) {
        const errorData = await fileUploadResponse.json().catch(() => ({}))
        console.error("[DEBUG] 파일 업로드 오류:", errorData)
        return Response.json({ error: "파일 업로드에 실패했습니다." }, { status: 500 })
      }

      const fileData = await fileUploadResponse.json()
      const fileId = fileData.id
      console.log(`[DEBUG] 파일 업로드 성공, file_id: ${fileId}`)

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
      const buffer = Buffer.from(await (file as any).arrayBuffer())
      const { value: docxText = '' } = await mammoth.extractRawText({ buffer })
      const textContent = docxText.trim()
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

    console.log(`[DEBUG] Responses API 요청:`, JSON.stringify(requestBody, null, 2))

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    console.log(`[DEBUG] Responses API 응답 상태: ${response.status}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[DEBUG] Responses API 오류:", errorData)

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
    console.log(`[DEBUG] Responses API 응답 데이터:`, data)

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
      console.error("[DEBUG] 요약 텍스트를 찾을 수 없음", { hasOutputText: !!data.output_text })
      throw new Error("요약을 생성할 수 없습니다.")
    }

    console.log(`[DEBUG] 받은 텍스트:`, resultText)

    // JSON 블록 추출 및 파싱
    try {
      const jsonMatch = resultText.match(/\{[^{}]*\}/s)
      console.log(`[DEBUG] JSON 매치 결과:`, jsonMatch)

      if (jsonMatch) {
        const jsonString = jsonMatch[0]
        console.log(`[DEBUG] 파싱할 JSON:`, jsonString)
        const parsedData = JSON.parse(jsonString)

        let summary = parsedData.summary || "요약 실패"
        if (Array.isArray(summary)) {
          summary = summary.join("\n")
        }

        const keywords = Array.isArray(parsedData.keywords)
          ? parsedData.keywords.join(", ")
          : (parsedData.keywords || "키워드 추출 실패")

        console.log(`[DEBUG] 파싱된 요약:`, summary)
        console.log(`[DEBUG] 파싱된 키워드:`, keywords)

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
      console.error("JSON 파싱 오류:", parseError)
      return Response.json({
        summary: resultText.trim(),
        keywords: "키워드 추출 실패"
      })
    }
  } catch (error) {
    console.error("Summarization error:", error)
    return Response.json({ error: "요약 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
}
