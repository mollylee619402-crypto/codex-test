const STAGE_CONTEXT_RE = /(阶段|流程|报告|工作阶段|工作流程|工作内容|主要工作)/
const NOISE_RE = /^[\s\-—–→←↑↓|｜·•*#_=+~.。,，、:：;；()（）\[\]【】]+$/

function normalizeText(value = '') {
  return String(value)
    .replace(/[\t\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-—–→←↑↓|｜·•*#_=+~.。,，、:：;；]+/, '')
    .replace(/[\s\-—–→←↑↓|｜·•*#_=+~.。,，、:：;；]+$/, '')
    .trim()
}

function getBox(item = {}) {
  const box = item.bbox || item.boundingBox || item.box || {}
  const x0 = Number(box.x0 ?? box.left ?? item.x0 ?? 0)
  const y0 = Number(box.y0 ?? box.top ?? item.y0 ?? 0)
  const x1 = Number(box.x1 ?? box.right ?? item.x1 ?? x0)
  const y1 = Number(box.y1 ?? box.bottom ?? item.y1 ?? y0)
  return {
    x0,
    y0,
    x1,
    y1,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0)
  }
}

function isValidText(value) {
  const text = normalizeText(value)
  return text.length >= 2 && !NOISE_RE.test(text)
}

function extractBlocks(ocrResult = {}) {
  const data = ocrResult.data || ocrResult
  const candidates = Array.isArray(data.lines) && data.lines.length
    ? data.lines
    : Array.isArray(data.words) && data.words.length
      ? data.words
      : []

  if (candidates.length) {
    return candidates
      .map((item) => ({ text: normalizeText(item.text), ...getBox(item) }))
      .filter((item) => isValidText(item.text))
  }

  return String(data.text || '')
    .split(/\r?\n/)
    .map((text, index) => ({ text: normalizeText(text), x0: 0, y0: index * 24, x1: 0, y1: index * 24 + 18, width: 0, height: 18 }))
    .filter((item) => isValidText(item.text))
}

function groupRows(blocks) {
  const sorted = [...blocks].sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0))
  const rows = []

  sorted.forEach((block) => {
    const centerY = block.y0 + block.height / 2
    const row = rows.find((item) => Math.abs(item.centerY - centerY) <= Math.max(12, item.avgHeight * 0.65, block.height * 0.65))
    if (row) {
      row.blocks.push(block)
      row.centerY = row.blocks.reduce((sum, item) => sum + item.y0 + item.height / 2, 0) / row.blocks.length
      row.avgHeight = row.blocks.reduce((sum, item) => sum + (item.height || 18), 0) / row.blocks.length
    } else {
      rows.push({ centerY, avgHeight: block.height || 18, blocks: [block] })
    }
  })

  return rows
    .sort((a, b) => a.centerY - b.centerY)
    .map((row) => row.blocks.sort((a, b) => a.x0 - b.x0).map((block) => block.text).join(' '))
    .map(normalizeText)
    .filter(isValidText)
}

function isStageTitle(text) {
  const normalized = normalizeText(text)
  if (/^阶段\s*[一二三四五六七八九十\d]+/.test(normalized)) return true
  if (/^[一二三四五六七八九十\d]+[、.．]\s*.+阶段/.test(normalized)) return true
  return STAGE_CONTEXT_RE.test(normalized) && normalized.length <= 24 && !/^(工作准备|报告编制|流程确认)$/.test(normalized)
}

function stagePrefix(index) {
  const labels = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  return labels[index - 1] || String(index)
}

function formatStageTitle(text, index) {
  const normalized = normalizeText(text)
  if (/^阶段\s*[一二三四五六七八九十\d]+\s*[：:、.-]/.test(normalized)) return normalized
  if (/^阶段\s*[一二三四五六七八九十\d]+/.test(normalized)) return normalized.replace(/^(阶段\s*[一二三四五六七八九十\d]+)\s*/, '$1：')
  return `阶段${stagePrefix(index)}：${normalized}`
}

export function ocrToStructuredInput(ocrResult = {}) {
  const blocks = extractBlocks(ocrResult)
  const lines = groupRows(blocks)
  const uniqueLines = lines.filter((line, index) => lines.indexOf(line) === index)

  if (!uniqueLines.length) {
    return { text: '', lines: [], blocks, hasStage: false }
  }

  const hasStage = uniqueLines.some(isStageTitle)
  if (!hasStage) {
    return {
      text: uniqueLines.map((line) => `* ${line}`).join('\n'),
      lines: uniqueLines,
      blocks,
      hasStage: false
    }
  }

  let stageCount = 0
  const output = []
  let hasNodeInCurrentStage = false

  uniqueLines.forEach((line) => {
    if (isStageTitle(line)) {
      if (output.length && !hasNodeInCurrentStage) output.push('* 待补充节点')
      stageCount += 1
      if (output.length) output.push('')
      output.push(formatStageTitle(line, stageCount))
      hasNodeInCurrentStage = false
      return
    }

    if (!output.length) {
      stageCount += 1
      output.push(`阶段${stagePrefix(stageCount)}：识别内容`)
    }
    output.push(`* ${line}`)
    hasNodeInCurrentStage = true
  })

  return { text: output.join('\n').trim(), lines: uniqueLines, blocks, hasStage: true }
}
