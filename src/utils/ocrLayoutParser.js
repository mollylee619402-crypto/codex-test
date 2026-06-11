import { normalizeOcrText } from './ocrTextCleaner.js'

function getBox(item = {}) {
  const box = item.bbox || item.boundingBox || item.box || {}
  const x0 = Number(box.x0 ?? box.left ?? box.x ?? item.x0 ?? item.left ?? 0)
  const y0 = Number(box.y0 ?? box.top ?? box.y ?? item.y0 ?? item.top ?? 0)
  const width = Number(box.width ?? item.width ?? 0)
  const height = Number(box.height ?? item.height ?? 0)
  const x1 = Number(box.x1 ?? box.right ?? item.x1 ?? item.right ?? (width ? x0 + width : x0))
  const y1 = Number(box.y1 ?? box.bottom ?? item.y1 ?? item.bottom ?? (height ? y0 + height : y0))
  return {
    x0,
    y0,
    x1,
    y1,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0)
  }
}

function normalizeBlock(item = {}) {
  const text = normalizeOcrText(item.text || item.words?.map((word) => word.text).join(' ') || '')
  return { text, ...getBox(item) }
}

function getOcrData(ocrResult = {}) {
  return ocrResult.data || ocrResult || {}
}

function getCandidates(data = {}) {
  if (Array.isArray(data.lines) && data.lines.length) return data.lines
  if (Array.isArray(data.blocks) && data.blocks.length) return data.blocks
  if (Array.isArray(data.paragraphs) && data.paragraphs.length) return data.paragraphs
  if (Array.isArray(data.words) && data.words.length) return data.words
  return []
}

function textFromData(data = {}) {
  return String(data.text || '')
}

function shouldMergeInline(left, right) {
  const leftHeight = left.height || 18
  const gap = right.x0 - left.x1
  return gap <= Math.max(24, leftHeight * 1.8)
}

function mergeRowBlocks(blocks) {
  const sorted = [...blocks].sort((a, b) => a.x0 - b.x0)
  const segments = []
  let current = null

  sorted.forEach((block) => {
    if (!current) {
      current = { ...block }
      return
    }
    if (shouldMergeInline(current, block)) {
      current.text = normalizeOcrText(`${current.text} ${block.text}`)
      current.x1 = Math.max(current.x1, block.x1)
      current.y0 = Math.min(current.y0, block.y0)
      current.y1 = Math.max(current.y1, block.y1)
      current.width = Math.max(0, current.x1 - current.x0)
      current.height = Math.max(0, current.y1 - current.y0)
    } else {
      segments.push(current)
      current = { ...block }
    }
  })

  if (current) segments.push(current)
  return segments.map((item) => item.text).join(' | ')
}

export function parseOcrLayout(ocrResult = {}, options = {}) {
  const data = getOcrData(ocrResult)
  const candidates = getCandidates(data)
  const blocks = candidates
    .map(normalizeBlock)
    .filter((block) => block.text)

  if (!blocks.length) {
    const lines = textFromData(data).split(/\r?\n/).map(normalizeOcrText).filter(Boolean)
    return { lines, blocks: [], rawText: textFromData(data) }
  }

  const sorted = [...blocks].sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0))
  const rows = []

  sorted.forEach((block) => {
    const centerY = block.y0 + (block.height || 18) / 2
    const row = rows.find((item) => Math.abs(item.centerY - centerY) <= Math.max(options.rowTolerance || 10, item.avgHeight * 0.65, (block.height || 18) * 0.65))
    if (row) {
      row.blocks.push(block)
      row.centerY = row.blocks.reduce((sum, item) => sum + item.y0 + (item.height || 18) / 2, 0) / row.blocks.length
      row.avgHeight = row.blocks.reduce((sum, item) => sum + (item.height || 18), 0) / row.blocks.length
    } else {
      rows.push({ centerY, avgHeight: block.height || 18, blocks: [block] })
    }
  })

  const lines = rows
    .sort((a, b) => a.centerY - b.centerY)
    .map((row) => normalizeOcrText(mergeRowBlocks(row.blocks)))
    .filter(Boolean)

  return { lines, blocks, rawText: textFromData(data) }
}
