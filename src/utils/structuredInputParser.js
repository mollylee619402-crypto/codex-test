const STAGE_RE = /^(?:#{1,6}\s*)?阶段\s*([一二三四五六七八九十\d]+)?\s*[：:、.-]?\s*(.+)?$/
const CAPTION_RE = /^图题\s*[：:]\s*(.+)$/
const BULLET_RE = /^(\s*)(?:[-*•·]|\d+[.)、])\s*(.+)$/

function cleanText(value = '') {
  return String(value).trim().replace(/^[：:]/, '').trim()
}

function flattenStageNodes(stage) {
  return (stage.nodes || []).flatMap((node) => [node.text, ...(node.children || [])]).filter(Boolean)
}

export function parseStructuredInput(text, options = {}) {
  const source = String(text || '').trim()
  const errors = []
  const stages = []
  let captionText = ''
  let currentStage = null
  let currentNode = null

  source.split(/\r?\n/).forEach((rawLine) => {
    if (!rawLine.trim()) return

    const captionMatch = rawLine.trim().match(CAPTION_RE)
    if (captionMatch) { captionText = cleanText(captionMatch[1]); return }

    const stageMatch = rawLine.trim().match(STAGE_RE)
    if (stageMatch) {
      const title = cleanText(stageMatch[2] || `阶段${stageMatch[1] || stages.length + 1}`)
      currentStage = { title, nodes: [] }
      stages.push(currentStage)
      currentNode = null
      return
    }

    const bulletMatch = rawLine.match(BULLET_RE)
    if (bulletMatch) {
      if (!currentStage) {
        currentStage = { title: '流程内容', nodes: [] }
        stages.push(currentStage)
      }
      const indent = bulletMatch[1].replace(/\t/g, '  ').length
      const value = cleanText(bulletMatch[2])
      if (!value) return
      if (indent >= 2 && currentNode) {
        currentNode.children = [...(currentNode.children || []), value]
      } else {
        currentNode = { text: value, children: [] }
        currentStage.nodes.push(currentNode)
      }
      return
    }

    errors.push(`未识别的行：${rawLine.trim()}`)
  })

  if (!stages.length && source) {
    stages.push({ title: '流程内容', nodes: [] })
  }

  return {
    captionText,
    stages,
    flatNodes: stages.flatMap(flattenStageNodes),
    errors: errors.slice(0, 5),
    isFallback: false
  }
}

export function structuredContentToMermaidNodes(diagramContent = {}) {
  const labels = (diagramContent.stages || []).flatMap((stage) => [stage.title, ...flattenStageNodes(stage)]).filter(Boolean)
  return labels.map((label, index) => ({
    id: `S${index + 1}`,
    label,
    type: index === 0 ? 'start' : index === labels.length - 1 ? 'output' : label.includes('风险') || label.includes('审查') ? 'risk' : 'process'
  }))
}

export function structuredInputToPlainText(diagramContent = {}) {
  const numerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  return (diagramContent.stages || []).map((stage, index) => [
    `阶段${numerals[index] || index + 1}：${stage.title}`,
    ...(stage.nodes || []).flatMap((node) => [`* ${node.text}`, ...(node.children || []).map((child) => `  * ${child}`)])
  ].join('\n')).join('\n\n')
}
