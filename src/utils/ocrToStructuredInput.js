import { cleanOcrLines } from './ocrTextCleaner.js'
import { parseOcrLayout } from './ocrLayoutParser.js'

const STAGE_CONTEXT_RE = /(阶段|流程|报告|工作阶段|工作流程|工作内容|主要工作)/

function normalizeText(value = '') {
  return String(value)
    .replace(/[\t\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-—–→←↑↓|｜·•*#_=+~.。,，、:：;；]+/, '')
    .replace(/[\s\-—–→←↑↓|｜·•*#_=+~.。,，、:：;；]+$/, '')
    .trim()
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

function formatGenericStructuredText(uniqueLines) {
  const hasStage = uniqueLines.some(isStageTitle)
  if (!hasStage) {
    return {
      text: uniqueLines.map((line) => `* ${line}`).join('\n'),
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

  return { text: output.join('\n').trim(), hasStage: true }
}

function logOcrMetrics(metrics) {
  console.info('[FlowCraft OCR] raw text length', metrics.rawTextLength)
  console.info('[FlowCraft OCR] raw lines count', metrics.rawLinesCount)
  console.info('[FlowCraft OCR] cleaned lines count', metrics.cleanedLinesCount)
  console.info('[FlowCraft OCR] removed noise count', metrics.removedNoiseCount)
  console.info('[FlowCraft OCR] detected caption', metrics.caption)
  console.info('[FlowCraft OCR] structured result lines count', metrics.structuredResultLinesCount)
  console.info('[FlowCraft OCR] quality score', metrics.qualityScore)
}

export function ocrToStructuredInput(ocrResult = {}) {
  const data = ocrResult.data || ocrResult || {}
  const layout = parseOcrLayout(ocrResult)
  const rawText = String(data.text || layout.rawText || layout.lines.join('\n') || '')
  const rawLines = layout.lines.length ? layout.lines : rawText.split(/\r?\n/)
  const cleaned = cleanOcrLines(rawLines)
  const uniqueLines = cleaned.lines

  if (!uniqueLines.length) {
    const emptyResult = {
      text: '',
      lines: [],
      rawText,
      rawLines,
      blocks: layout.blocks,
      hasStage: false,
      caption: cleaned.caption,
      removedNoiseCount: cleaned.removedNoiseCount,
      qualityScore: cleaned.qualityScore
    }
    logOcrMetrics({
      rawTextLength: rawText.length,
      rawLinesCount: rawLines.filter((line) => String(line).trim()).length,
      cleanedLinesCount: 0,
      removedNoiseCount: cleaned.removedNoiseCount,
      caption: cleaned.caption,
      structuredResultLinesCount: 0,
      qualityScore: cleaned.qualityScore
    })
    return emptyResult
  }

  const generic = formatGenericStructuredText(uniqueLines)
  const text = cleaned.structuredText || generic.text
  const result = {
    text,
    lines: uniqueLines,
    rawText,
    rawLines,
    blocks: layout.blocks,
    hasStage: Boolean(cleaned.structuredText) || generic.hasStage,
    caption: cleaned.caption,
    removedNoiseCount: cleaned.removedNoiseCount,
    qualityScore: cleaned.qualityScore
  }

  logOcrMetrics({
    rawTextLength: rawText.length,
    rawLinesCount: rawLines.filter((line) => String(line).trim()).length,
    cleanedLinesCount: uniqueLines.length,
    removedNoiseCount: cleaned.removedNoiseCount,
    caption: cleaned.caption,
    structuredResultLinesCount: text.split(/\r?\n/).filter((line) => line.trim()).length,
    qualityScore: cleaned.qualityScore
  })

  return result
}
