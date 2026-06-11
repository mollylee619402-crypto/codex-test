const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const TARGET_IMAGE_BYTES = 2.8 * 1024 * 1024
const MAX_IMAGE_EDGE = 2200
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('图片读取失败，请重新上传后再试。'))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败，请确认文件未损坏。'))
    image.src = dataUrl
  })
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || ''
  return Math.ceil((base64.length * 3) / 4)
}

async function compressImageFile(file) {
  const originalDataUrl = await readFileAsDataUrl(file)
  if (file.size <= TARGET_IMAGE_BYTES && dataUrlToBytes(originalDataUrl) <= TARGET_IMAGE_BYTES) return originalDataUrl

  const image = await loadImage(originalDataUrl)
  const maxEdge = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height)
  const scale = maxEdge > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / maxEdge : 1
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale))
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const qualities = [0.9, 0.82, 0.74, 0.66]
  let bestDataUrl = canvas.toDataURL('image/jpeg', qualities[0])
  for (const quality of qualities) {
    const nextDataUrl = canvas.toDataURL('image/jpeg', quality)
    bestDataUrl = nextDataUrl
    if (dataUrlToBytes(nextDataUrl) <= TARGET_IMAGE_BYTES) break
  }

  return dataUrlToBytes(bestDataUrl) < dataUrlToBytes(originalDataUrl) ? bestDataUrl : originalDataUrl
}

function normalizeVisionResponse(payload = {}) {
  const result = payload.result && typeof payload.result === 'object' ? payload.result : payload
  return {
    templateType: typeof result.templateType === 'string' ? result.templateType : '',
    figureNumber: typeof result.figureNumber === 'string' ? result.figureNumber : '',
    figureTitle: typeof result.figureTitle === 'string' ? result.figureTitle : '',
    diagramKind: typeof result.diagramKind === 'string' ? result.diagramKind : '',
    structuredInput: typeof result.structuredInput === 'string' ? result.structuredInput : '',
    nodes: Array.isArray(result.nodes) ? result.nodes : [],
    warnings: Array.isArray(result.warnings) ? result.warnings.filter(Boolean).map(String) : []
  }
}

export async function extractDiagramWithVision(file, { templateType = '', figureNumber = '', figureTitle = '' } = {}) {
  if (!file) throw new Error('请先上传图片。')
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error('图片格式不支持，请上传 PNG、JPG、JPEG 或 WEBP。')

  const imageDataUrl = await compressImageFile(file)
  const imageBytes = dataUrlToBytes(imageDataUrl)
  if (imageBytes > MAX_IMAGE_BYTES) throw new Error('图片过大，请裁剪后重试。')

  const response = await fetch('/api/vision-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl, fileName: file.name || 'flow-diagram', templateType, figureNumber, figureTitle })
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || 'AI 识图请求失败。网络异常，请稍后重试。'
    const error = new Error(message)
    error.status = response.status
    error.code = payload?.code
    throw error
  }

  const result = normalizeVisionResponse(payload)
  if (!result.structuredInput.trim()) throw new Error('AI 返回格式异常，请重试或改用本地 OCR。')
  return { ...result, imageBytes }
}
