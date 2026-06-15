const NOISE_LINE_PATTERN = /^[\s\W_]{1,}$|^[A-Za-z0-9+/=]{18,}$|^[□■◆◇●○·•\-—_\s]{2,}$/
const STAGE_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const SENTENCE_BLOCK_RE = /^第\s*([一二三四五六七八九十\d]+)\s*句\s*[：:、.-]?\s*(.+?)\s*[。.]?$/

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

function cleanSentenceText(value = '') {
  return normalizeChineseSpacing(value)
    .replace(/^[：:、，,\s]+/, '')
    .replace(/[。；;]\s*$/, '')
    .trim()
}

function splitIndicators(value = '') {
  return cleanSentenceText(value)
    .replace(/^看\s*/, '')
    .replace(/As\s*、\s*Cd/gi, 'As、Cd')
    .replace(/As、Cd/gi, 'As__CD')
    .split(/[、，,；;]/)
    .map((item) => cleanSentenceText(item).replace(/As__CD/g, 'As、Cd'))
    .filter(Boolean)
}

function normalizeQuestionTitle(value = '') {
  return cleanSentenceText(value)
    .replace(/^看\s*/, '')
    .replace(/如何$/, '')
    .replace(/怎么样$/, '')
    .replace(/[？?]$/, '')
    .trim()
}

function buildIndicatorText(question = '', indicator = '') {
  const item = cleanSentenceText(indicator)
  if (!item) return ''
  if (/施工前后\s*As、Cd/.test(item) && /风险|下降/.test(question)) return '施工前后 As、Cd 变化'
  if (/潜在生态风险等级/.test(item) && /风险|下降/.test(question)) return '潜在生态风险等级变化'
  if (/高风险河段/.test(item) && /风险|下降/.test(question)) return '高风险河段变化'
  return item
}

function organizeSentenceBlocks(value = '') {
  const blocks = []
  let currentBlock = null

  normalizeChineseSpacing(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(SENTENCE_BLOCK_RE)
      if (match) {
        currentBlock = {
          question: normalizeQuestionTitle(match[2]),
          indicators: []
        }
        blocks.push(currentBlock)
        return
      }
      if (currentBlock) {
        currentBlock.indicators.push(...splitIndicators(line))
      }
    })

  if (!blocks.length) return ''

  return [
    '阶段一：项目评价思路',
    '',
    ...blocks.flatMap((block) => [
      `* ${block.question}`,
      ...block.indicators.map((indicator) => `  * ${buildIndicatorText(block.question, indicator)}`)
    ])
  ].join('\n').trim()
}

export function organizeStructuredText(value = '') {
  const sentenceBlockText = organizeSentenceBlocks(value)
  if (sentenceBlockText) return { text: sentenceBlockText, caption: detectFigureCaption(value) }

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
  if (!hasStage && !/^图题：/.test(text)) return { text: `阶段一：流程内容\n${text}`, caption }
  return { text, caption }
}
