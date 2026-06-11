const CJK_RE = /[\u3400-\u9fff]/
const CJK_GLOBAL_RE = /[\u3400-\u9fff]/g
const NOISE_LINE_RE = /^[\s\-—–→←↑↓|｜·•*#_=+~.。,，、:：;；()（）\[\]【】{}<>《》/\\]+$/
const ASCII_NOISE_RE = /^(?:[a-z]{1,4}|[A-Z]{3,}|[A-Za-z]{1,2}\d?|\d+[A-Za-z]{0,2})$/
const ISOLATED_TOKEN_RE = /^[一二三四五六七八九十零〇\d可口日目]$/

export const commonOcrCorrections = [
  ['准存', '堆存'],
  ['谁存', '堆存'],
  ['清近', '清挖'],
  ['清控', '清挖'],
  ['处里', '处理'],
  ['预处里', '预处理'],
  ['协同处里', '协同处置'],
  ['协同处理', '协同处置'],
  ['生态修夏', '生态修复'],
  ['生态侈复', '生态修复'],
  ['底泥预处埋', '底泥预处理'],
  ['围堰导充', '围堰导流'],
  ['涵洞清於', '涵洞清淤'],
  ['清於', '清淤'],
  ['清表', '清表'],
  ['水泥客', '水泥窑'],
  ['水泥容', '水泥窑']
]

const TECHNICAL_ROUTE_KEYWORDS = [
  '技术路线图',
  '项目整治',
  '污染源',
  '底泥处置',
  '清淤',
  '预处理',
  '运输处理',
  '运输处置',
  '协同处置',
  '生态修复'
]

const UPSTREAM_NODES = [
  { label: '洗金场堆存尾砂清挖运输', aliases: ['洗金场堆存尾砂清挖运输', '洗金场准存尾砂清近运输', '尾砂清挖运输'] },
  { label: '水泥窑协同处置', aliases: ['水泥窑协同处置', '协同处置'] },
  { label: '尾砂堆场风险管控生态修复', aliases: ['尾砂堆场风险管控生态修复', '风险管控生态修复', '生态修复'] }
]

const SEDIMENT_NODES = [
  { label: '清淤', aliases: ['清淤', '清於'] },
  { label: '清表', aliases: ['清表'] },
  { label: '围堰导流', aliases: ['围堰导流'] },
  { label: '涵洞清淤', aliases: ['涵洞清淤'] },
  { label: '底泥预处理', aliases: ['底泥预处理', '预处理'] },
  { label: '垃圾清理', aliases: ['垃圾清理'] },
  { label: '添加调理剂降低含水率', aliases: ['添加调理剂降低含水率', '调理剂', '含水率'] },
  { label: '运输处理', aliases: ['运输处理', '运输处置'] },
  { label: '底泥装袋、转运', aliases: ['底泥装袋', '装袋转运', '转运'] },
  { label: '运输至处置单位', aliases: ['运输至处置单位', '处置单位'] },
  { label: '水泥窑协同处置', aliases: ['水泥窑协同处置', '协同处置'] }
]

function removeChineseSpaces(text) {
  let next = text
  while (/([\u3400-\u9fff])\s+([\u3400-\u9fff])/.test(next)) {
    next = next.replace(/([\u3400-\u9fff])\s+([\u3400-\u9fff])/g, '$1$2')
  }
  return next
}

export function normalizeOcrText(value = '') {
  return removeChineseSpaces(String(value)
    .replace(/[\t\r]+/g, ' ')
    .replace(/[｜]/g, '|')
    .replace(/[，]/g, '，')
    .replace(/\s+/g, ' ')
    .trim())
}

export function applyCommonOcrCorrections(value = '') {
  return commonOcrCorrections.reduce((text, [from, to]) => text.replaceAll(from, to), value)
}

function stripDecorations(value = '') {
  return value
    .replace(/^[\s\-—–→←↑↓|·•*#_=+~.。,，、:：;；()（）\[\]【】{}<>《》/\\]+/, '')
    .replace(/[\s\-—–→←↑↓|·•*#_=+~.。,，、:：;；()（）\[\]【】{}<>《》/\\]+$/, '')
    .trim()
}

function removeInlineNoiseTokens(value = '') {
  return value
    .split(/\s+/)
    .filter((token) => {
      const stripped = stripDecorations(token)
      if (!stripped) return false
      if (!CJK_RE.test(stripped) && ASCII_NOISE_RE.test(stripped)) return false
      return true
    })
    .join(' ')
}

function cjkLength(value = '') {
  return (value.match(CJK_GLOBAL_RE) || []).length
}

function isMeaningfulLine(value = '') {
  const text = stripDecorations(value)
  if (!text || NOISE_LINE_RE.test(text) || ISOLATED_TOKEN_RE.test(text)) return false
  const chineseLength = cjkLength(text)
  if (chineseLength >= 2) return true
  if (/^图\s*[·.]?\s*[\d０-９]+/.test(text) && chineseLength >= 1) return true
  if (chineseLength === 1 && text.length <= 3) return false
  return chineseLength > 0 || (!ASCII_NOISE_RE.test(text) && text.length >= 5)
}

function cleanSingleLine(line = '') {
  const normalized = normalizeOcrText(line)
  const withoutInlineNoise = removeInlineNoiseTokens(normalized)
  const corrected = applyCommonOcrCorrections(withoutInlineNoise)
  return stripDecorations(normalizeOcrText(corrected))
}

function splitPotentialSegments(line = '') {
  return String(line)
    .split(/[|｜]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

export function detectOcrCaption(lines = []) {
  for (const line of lines) {
    const text = normalizeOcrText(line).replace(/图\s*[·。]\s*/g, '图')
    const match = text.match(/图\s*([\d０-９]+(?:\s*[.．。\-－—–]\s*[\d０-９]+)*)\s*[-—–:：]?\s*(.+)?$/)
    if (match) {
      const numberPart = match[1].replace(/\s+/g, '').replace(/[．。－—–]/g, (char) => (char === '．' || char === '。' ? '.' : '-'))
      const title = stripDecorations(cleanSingleLine(match[2] || ''))
      return {
        figureNumber: `图${numberPart}`,
        figureTitle: title || '',
        raw: line
      }
    }
  }

  const titleCandidate = lines.find((line) => /(?:项目整治|工艺|技术)路线图/.test(line))
  if (titleCandidate) {
    return { figureNumber: '', figureTitle: stripDecorations(cleanSingleLine(titleCandidate)), raw: titleCandidate }
  }

  return { figureNumber: '', figureTitle: '', raw: '' }
}

function dedupeLines(lines) {
  const seen = new Set()
  return lines.filter((line) => {
    const key = line.replace(/[\s，,、:：]/g, '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function matchesAny(source, aliases) {
  return aliases.some((alias) => source.includes(alias))
}

function pickRouteNodes(corpus, definitions) {
  const picked = []
  definitions.forEach((item) => {
    if (matchesAny(corpus, item.aliases) && !picked.includes(item.label)) picked.push(item.label)
  })
  return picked
}

export function structureTechnicalRoute(cleanedLines = [], caption = {}) {
  const corpus = cleanedLines.join(' ')
  const keywordCount = TECHNICAL_ROUTE_KEYWORDS.filter((keyword) => corpus.includes(keyword)).length
  if (keywordCount < 3) return null

  const upstreamNodes = pickRouteNodes(corpus, UPSTREAM_NODES)
  const sedimentNodes = pickRouteNodes(corpus, SEDIMENT_NODES)
  const hasUpstreamGroup = /(?:消除上游污染源|上游污染源|污染源)/.test(corpus) || upstreamNodes.length > 0
  const hasSedimentGroup = /(?:河道污染底泥处置|底泥处置|底泥)/.test(corpus) || sedimentNodes.length > 0
  const title = (caption.figureTitle || cleanedLines.find((line) => /(?:项目整治|技术|工艺)路线图/.test(line)) || '项目整治技术路线图')
    .replace(/^项目整治技术路线图$/, '项目整治技术路线')
    .replace(/图$/, '')

  const output = [`阶段一：${title}`]
  if (hasUpstreamGroup) {
    output.push('', '* 消除上游污染源')
    upstreamNodes.forEach((node) => output.push(`  * ${node}`))
  }
  if (hasSedimentGroup) {
    output.push('', '* 河道污染底泥处置')
    sedimentNodes.forEach((node) => output.push(`  * ${node}`))
  }

  return output.length > 1 ? output.join('\n') : null
}

export function cleanOcrLines(lines = [], options = {}) {
  const rawLines = Array.isArray(lines) ? lines : String(lines || '').split(/\r?\n/)
  const cleaned = []
  let removedNoiseCount = 0

  rawLines.forEach((line) => {
    const segments = splitPotentialSegments(line)
    const sourceSegments = segments.length ? segments : [line]
    sourceSegments.forEach((segment) => {
      const cleanedLine = cleanSingleLine(segment)
      if (isMeaningfulLine(cleanedLine)) cleaned.push(cleanedLine)
      else if (String(segment || '').trim()) removedNoiseCount += 1
    })
  })

  const deduped = dedupeLines(cleaned)
  const caption = detectOcrCaption(deduped)
  const structuredText = options.structure === false ? '' : structureTechnicalRoute(deduped, caption)
  const qualityScore = rawLines.length
    ? Math.max(0, Math.min(100, Math.round((deduped.length / rawLines.length) * 70 + (caption.figureTitle ? 15 : 0) + (structuredText ? 15 : 0))))
    : 0

  return {
    lines: deduped,
    text: deduped.join('\n'),
    caption,
    removedNoiseCount,
    structuredText,
    qualityScore
  }
}

export function cleanOcrText(rawText = '', options = {}) {
  return cleanOcrLines(String(rawText || '').split(/\r?\n/), options)
}
