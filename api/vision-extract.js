const MAX_DATA_URL_BYTES = 4 * 1024 * 1024
const SUPPORTED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
const MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-5'

function sendJson(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function byteLengthFromDataUrl(dataUrl) {
  const base64 = String(dataUrl || '').split(',')[1] || ''
  return Math.ceil((base64.length * 3) / 4)
}

function validateImageDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i)
  if (!match) return { ok: false, message: '图片格式不支持，请上传 PNG、JPG、JPEG 或 WEBP。' }
  const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase()
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) return { ok: false, message: '图片格式不支持，请上传 PNG、JPG、JPEG 或 WEBP。' }
  if (byteLengthFromDataUrl(dataUrl) > MAX_DATA_URL_BYTES) return { ok: false, code: 'IMAGE_TOO_LARGE', message: '图片过大，请裁剪后重试。' }
  return { ok: true, mimeType }
}

function stripCodeFence(text) {
  return String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

function extractJsonObject(text) {
  const stripped = stripCodeFence(text)
  try {
    return JSON.parse(stripped)
  } catch {}

  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(stripped.slice(start, end + 1))
    } catch {}
  }
  return null
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeResult(raw) {
  const warnings = Array.isArray(raw?.warnings) ? raw.warnings.filter(Boolean).map(String) : []
  if (!warnings.some((warning) => warning.includes('人工校对'))) warnings.push('识别结果为 AI 推断，请人工校对。')
  return {
    templateType: normalizeString(raw?.templateType) || 'basic',
    figureNumber: normalizeString(raw?.figureNumber),
    figureTitle: normalizeString(raw?.figureTitle),
    diagramKind: normalizeString(raw?.diagramKind) || '普通流程图',
    structuredInput: normalizeString(raw?.structuredInput),
    nodes: Array.isArray(raw?.nodes) ? raw.nodes : [],
    warnings
  }
}

function buildPrompt({ templateType, figureNumber, figureTitle }) {
  return `你是环保工程技术报告流程图识别专家。请理解图片中的流程图，不只是 OCR。请严格遵守：
1. 识别图号 figureNumber，例如“图5.6-1”。没有则返回空字符串。
2. 识别图题 figureTitle。没有则返回空字符串。
3. 识别主要流程节点、分组标题、阶段标题、并列关系和层级关系。
4. 保持中文原文，尽量保留专业术语和编号。
5. 不要编造图片中没有的内容。
6. 看不清的文字请写成“疑似：xxx”，无法判断可写“疑似：未识别文字”。
7. 输出 structuredInput，格式用于 FlowCraft 结构化节点编辑区：阶段行使用“阶段一：xxx”或“阶段：xxx”，节点使用“* 节点”，子节点使用两个空格缩进后“* 子节点”。
8. 根据图片尽量判断 templateType，只能使用这些值之一：site-survey（资料收集与踏勘流程图）、technical-service（技术服务总体流程图）、project-org（项目组织架构图）、environment-process（工艺路线图/环保工艺流程图）、basic（普通流程图）。无法判断时使用 ${templateType || 'basic'}。
9. 输出严格 JSON，不要输出 Markdown、解释、代码块或额外文字。

当前用户选择模板：${templateType || '未指定'}。
当前项目参数图号：${figureNumber || '未填写'}。
当前项目参数图题：${figureTitle || '未填写'}。

JSON 结构必须为：
{
  "templateType": "technical-service|site-survey|project-org|environment-process|basic",
  "figureNumber": "",
  "figureTitle": "",
  "diagramKind": "资料收集与踏勘流程图|技术服务总体流程图|项目组织架构图|工艺路线图|普通流程图",
  "structuredInput": "阶段一：...\n* ...\n  * ...",
  "nodes": [{ "text": "节点", "children": ["子节点"] }],
  "warnings": ["识别结果为 AI 推断，请人工校对。"]
}`
}

function getOutputText(responseJson) {
  if (typeof responseJson?.output_text === 'string') return responseJson.output_text
  const chunks = []
  for (const item of responseJson?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text)
    }
  }
  return chunks.join('\n')
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb'
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(res, 501, {
      code: 'OPENAI_API_KEY_MISSING',
      message: 'AI 识图未配置，请在 Vercel 环境变量中配置 OPENAI_API_KEY，或继续使用本地 OCR / 手动编辑。'
    })
    return
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {}
  const { imageDataUrl, templateType = 'basic', figureNumber = '', figureTitle = '' } = body
  const validation = validateImageDataUrl(imageDataUrl)
  if (!validation.ok) {
    sendJson(res, validation.code === 'IMAGE_TOO_LARGE' ? 413 : 400, { code: validation.code || 'INVALID_IMAGE', message: validation.message })
    return
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: buildPrompt({ templateType, figureNumber, figureTitle }) },
              { type: 'input_image', image_url: imageDataUrl, detail: 'high' }
            ]
          }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'flowcraft_vision_extract',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['templateType', 'figureNumber', 'figureTitle', 'diagramKind', 'structuredInput', 'nodes', 'warnings'],
              properties: {
                templateType: { type: 'string', enum: ['site-survey', 'technical-service', 'project-org', 'environment-process', 'basic'] },
                figureNumber: { type: 'string' },
                figureTitle: { type: 'string' },
                diagramKind: { type: 'string' },
                structuredInput: { type: 'string' },
                nodes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['text', 'children'],
                    properties: {
                      text: { type: 'string' },
                      children: { type: 'array', items: { type: 'string' } }
                    }
                  }
                },
                warnings: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      })
    })

    const responseJson = await openaiResponse.json().catch(() => ({}))
    if (!openaiResponse.ok) {
      const apiMessage = responseJson?.error?.message || responseJson?.message || 'AI 识图请求失败。网络异常，请稍后重试。'
      sendJson(res, openaiResponse.status, { code: 'OPENAI_REQUEST_FAILED', message: apiMessage })
      return
    }

    const text = getOutputText(responseJson)
    const parsed = extractJsonObject(text)
    if (!parsed) {
      sendJson(res, 502, { code: 'INVALID_AI_JSON', message: 'AI 返回格式异常，请重试或改用本地 OCR。' })
      return
    }

    const result = normalizeResult(parsed)
    if (!result.structuredInput) {
      sendJson(res, 422, { code: 'EMPTY_VISION_RESULT', message: '当前图片文字过小，建议上传更清晰截图。识别结果可能不完整，请人工校对。' })
      return
    }

    sendJson(res, 200, { result })
  } catch (error) {
    console.error('[FlowCraft vision-extract] failed', error)
    sendJson(res, 500, { code: 'VISION_EXTRACT_FAILED', message: 'AI 识图请求失败。网络异常，请稍后重试。' })
  }
}
