const NOISE_LINE_PATTERN = /^[\s\W_]{1,}$|^[A-Za-z0-9+/=]{18,}$|^[□■◆◇●○·•\-—_\s]{2,}$/
const STAGE_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

export function normalizeChineseSpacing(value = '') {
  return String(value || '')
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
    .replace(/[\t\r]+/g, '\n')
    .replace(/[|｜]+/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
}

export function detectFigureCaption(value = '') {
  const match = normalizeChineseSpacing(value).match(/(图\s*[\d０-９]+(?:\s*[.．。\-－—–]\s*[\d０-９]+)*)(?:\s*[-—–:：]?\s*)([^\n]*)/)
  if (!match) return { figureNumber: '', figureTitle: '' }
  return {
    figureNumber: match[1].replace(/\s+/g, '').replace(/[．。]/g, '.').replace(/[－—–]/g, '-'),
    figureTitle: (match[2] || '').trim()
  }
}

function stripLinePrefix(line = '') {
  return line
    .replace(/^\s*(?:\d+[\.、)]|[（(]?[一二三四五六七八九十]+[）)、.]|[①②③④⑤⑥⑦⑧⑨⑩]|[•·●○◆◇■□-])\s*/, '')
    .replace(/^\s*[*+-]\s*/, '')
    .trim()
}

function isStageLine(line = '') {
  return /^阶段\s*[一二三四五六七八九十\d]*\s*[:：]/.test(line.trim())
}

export function organizeStructuredText(value = '') {
  const seen = new Set()
  const output = []
  let stageIndex = 0
  let hasStage = false
  const caption = detectFigureCaption(value)

  normalizeChineseSpacing(value)
    .split('\n')
    .map((line) => line.replace(/\u00a0/g, ' ').trimEnd())
    .filter(Boolean)
    .forEach((rawLine) => {
      const compact = rawLine.trim()
      if (!compact || NOISE_LINE_PATTERN.test(compact)) return
      if (/^图\s*[\d０-９]+/.test(compact)) {
        const key = `caption:${compact}`
        if (!seen.has(key)) { seen.add(key); output.push(`图题：${compact}`) }
        return
      }
      if (isStageLine(compact)) {
        hasStage = true
        stageIndex += 1
        const title = compact.replace(/^阶段\s*[一二三四五六七八九十\d]*\s*[:：]\s*/, '').trim()
        if (output.length) output.push('')
        output.push(`阶段${STAGE_NUMERALS[stageIndex - 1] || stageIndex}：${title || '未命名阶段'}`)
        return
      }
      const isChild = /^\s{2,}[*+-]?\s*\S/.test(rawLine)
      const text = normalizeChineseSpacing(stripLinePrefix(compact)).trim()
      if (!text || NOISE_LINE_PATTERN.test(text)) return
      const key = `${isChild ? 'child' : 'node'}:${text}`
      if (seen.has(key)) return
      seen.add(key)
      output.push(`${isChild ? '  ' : ''}* ${text}`)
    })

  const text = output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!text) return { text: '', caption }
  if (!hasStage && !/^图题：/.test(text)) return { text: `阶段一：项目流程\n${text}`, caption }
  return { text, caption }
}
