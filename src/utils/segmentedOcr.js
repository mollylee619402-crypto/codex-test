import { cleanOcrLines, cleanOcrText, detectOcrCaption, structureTechnicalRoute } from './ocrTextCleaner.js'
import { cropImageRegion } from './flowBoxDetector.js'
import { ocrToStructuredInput } from './ocrToStructuredInput.js'

const MAX_DEFAULT_SEGMENTS = 20

function nodeSort(a, b) {
  const rowTolerance = Math.max(18, Math.min(a.height || 0, b.height || 0) * 0.65)
  if (Math.abs(a.y - b.y) <= rowTolerance) return a.x - b.x
  return a.y - b.y
}

function dedupeNodes(nodes) {
  const seen = new Set()
  return nodes.filter((node) => {
    const key = String(node.text || '').replace(/[\s，,、:：。.;；]/g, '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isReadableText(text = '') {
  const compact = String(text).replace(/\s+/g, '')
  if (!compact) return false
  if (/^[\W_]+$/.test(compact)) return false
  const cjk = (compact.match(/[\u3400-\u9fff]/g) || []).length
  return cjk >= 2 || compact.length >= 4
}

export function formatSegmentedNodes(nodes = [], caption = {}) {
  const lines = nodes.map((node) => node.text).filter(Boolean)
  const structured = structureTechnicalRoute(lines, caption)
  if (structured) return structured
  const groupNodes = nodes.filter((node) => node.type === 'group' && node.text)
  const itemNodes = nodes.filter((node) => node.type !== 'group' && node.type !== 'caption' && node.text)
  if (groupNodes.length >= 2 && itemNodes.length) {
    const output = []
    groupNodes.sort(nodeSort).forEach((group, index) => {
      if (output.length) output.push('')
      output.push(`阶段${['一', '二', '三', '四', '五', '六'][index] || index + 1}：${group.text}`)
      const children = itemNodes.filter((node) => node.x >= group.x - 8 && node.y >= group.y - 8 && node.x + node.width <= group.x + group.width + 8 && node.y + node.height <= group.y + group.height + 8)
      ;(children.length ? children : itemNodes).sort(nodeSort).slice(0, children.length || 8).forEach((node) => output.push(`* ${node.text}`))
    })
    return output.join('\n')
  }
  return ['阶段一：图片识别结果', '', ...lines.map((line) => `* ${line}`)].join('\n')
}

export async function recognizeSegmentedImage(file, boxes = [], options = {}) {
  const { recognizeImageText } = await import('./imageOcr.js')
  const sortedBoxes = [...boxes]
    .filter((box) => box && box.width > 0 && box.height > 0)
    .sort((a, b) => (b.confidence - a.confidence) || nodeSort(a, b))
    .slice(0, options.maxSegments || MAX_DEFAULT_SEGMENTS)
    .sort(nodeSort)

  const details = []
  const nodes = []
  const rawTextParts = []

  for (let index = 0; index < sortedBoxes.length; index += 1) {
    const box = sortedBoxes[index]
    options.onSegmentStart?.({ index: index + 1, total: sortedBoxes.length, box })
    try {
      const scale = box.width < 220 || box.height < 90 ? 2 : 1.45
      const crop = await cropImageRegion(file, box, { padding: options.padding ?? 10, scale, binarize: true })
      const ocrResult = await recognizeImageText(crop, {
        preprocessOptions: { enhanceContrast: true, grayscale: true, autoCrop: false, upscale: false, useOriginal: false },
        onProgress: options.onProgress,
        onWarning: options.onWarning
      })
      const rawText = String(ocrResult?.data?.text || '')
      const cleaned = cleanOcrText(rawText, { structure: false })
      const cleanText = cleaned.lines.join(' ')
      rawTextParts.push(rawText)
      const detail = { index: index + 1, box, rawText, cleanText, confidence: box.confidence, type: box.type }
      details.push(detail)
      if (isReadableText(cleanText)) {
        nodes.push({ text: cleanText, x: box.x, y: box.y, width: box.width, height: box.height, confidence: box.confidence, type: box.type })
      }
      options.onSegmentComplete?.(detail)
    } catch (error) {
      console.warn('[FlowCraft OCR] segmented box skipped', { box, error })
      details.push({ index: index + 1, box, rawText: '', cleanText: '', error: error?.message || 'OCR 失败', confidence: box.confidence, type: box.type })
    }
  }

  const orderedNodes = dedupeNodes(nodes.sort(nodeSort))
  const allLines = orderedNodes.map((node) => node.text)
  const caption = detectOcrCaption([...allLines, ...rawTextParts.join('\n').split(/\r?\n/)])
  const text = orderedNodes.length ? formatSegmentedNodes(orderedNodes, caption) : ''
  const cleaned = cleanOcrLines(allLines, { structure: false })
  return { text, nodes: orderedNodes, details, rawText: rawTextParts.join('\n\n---\n\n'), lines: cleaned.lines, caption, qualityScore: cleaned.qualityScore }
}

export function ocrResultFromSingleRegion(ocrResult) {
  return ocrToStructuredInput(ocrResult)
}
