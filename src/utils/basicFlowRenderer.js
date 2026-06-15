import { captionFromProjectConfig } from './projectConfigDefaults.js'

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}

function wrapText(text = '', max = 14) {
  const chars = Array.from(String(text))
  const lines = []
  for (let i = 0; i < chars.length; i += max) lines.push(chars.slice(i, i + max).join(''))
  return lines.length ? lines : ['']
}

function textSvg(text, x, y, maxChars, lineHeight = 18, attrs = '') {
  return wrapText(text, maxChars).map((line, index) => `<tspan x="${x}" y="${y + index * lineHeight}" ${attrs}>${esc(line)}</tspan>`).join('')
}

export function renderBasicFlowSvg(diagramContent = {}, projectConfig = {}, metadata = {}) {
  const stages = (diagramContent.stages || []).filter((stage) => stage?.title || stage?.nodes?.length)
  const safeStages = stages.length ? stages : [{ title: '流程内容', nodes: [{ text: '请在第 3 步编辑结构化内容', children: [] }] }]
  const width = 1120
  const margin = 48
  const stageGap = 34
  const nodeGap = 18
  const nodeW = 300
  const nodeH = 54
  const childW = 220
  const childH = 38
  const childGapX = 16
  const childGapY = 10
  const title = captionFromProjectConfig(projectConfig, metadata.caption || metadata.title || '')
  const blocks = []
  let y = 62

  safeStages.forEach((stage, stageIndex) => {
    const startY = y
    y += 58
    ;(stage.nodes || []).forEach((node, nodeIndex) => {
      const children = node.children || []
      const columns = children.length > 6 ? 2 : 1
      const rows = Math.ceil(children.length / columns)
      const rowH = Math.max(nodeH, rows ? rows * childH + (rows - 1) * childGapY : nodeH)
      blocks.push({ type: 'node', stageIndex, nodeIndex, node, x: margin + 72, y, w: nodeW, h: nodeH, rowH, children, columns })
      y += rowH + nodeGap
    })
    const stageHeight = y - startY + 8
    blocks.push({ type: 'stage', stageIndex, title: stage.title || `阶段${stageIndex + 1}`, x: margin, y: startY, w: width - margin * 2, h: stageHeight })
    y += stageGap
  })

  const height = Math.max(520, y + 64)
  const stageRects = blocks.filter((b) => b.type === 'stage').map((stage) => `
    <rect x="${stage.x}" y="${stage.y}" width="${stage.w}" height="${stage.h}" rx="16" fill="#f6f9fc" stroke="#bfd0df" stroke-width="1.4" stroke-dasharray="6 5"/>
    <rect x="${stage.x}" y="${stage.y}" width="${stage.w}" height="42" rx="16" fill="#eaf4ff" stroke="none"/>
    <text font-size="18" font-weight="700" fill="#17324d">${textSvg(stage.title, stage.x + 22, stage.y + 27, 34)}</text>`).join('')

  const nodeShapes = blocks.filter((b) => b.type === 'node').map((item, index, list) => {
    const nodeCx = item.x + item.w / 2
    const next = list[index + 1]
    const childStartX = item.x + item.w + 74
    const childStartY = item.y
    const childShapes = item.children.map((child, childIndex) => {
      const col = childIndex % item.columns
      const row = Math.floor(childIndex / item.columns)
      const x = childStartX + col * (childW + childGapX)
      const yy = childStartY + row * (childH + childGapY)
      return `<rect x="${x}" y="${yy}" width="${childW}" height="${childH}" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
        <text font-size="13" fill="#334155" text-anchor="middle">${textSvg(child, x + childW / 2, yy + 24, 14)}</text>`
    }).join('')
    const childConnectors = item.children.length ? `<line x1="${item.x + item.w}" y1="${item.y + nodeH / 2}" x2="${childStartX - 16}" y2="${item.y + nodeH / 2}" stroke="#94a3b8" stroke-width="1.2" marker-end="url(#arrow)"/>` : ''
    const nextArrow = next && next.stageIndex === item.stageIndex ? `<line x1="${nodeCx}" y1="${item.y + nodeH}" x2="${nodeCx}" y2="${next.y - 8}" stroke="#64748b" stroke-width="1.4" marker-end="url(#arrow)"/>` : ''
    return `${nextArrow}${childConnectors}<rect x="${item.x}" y="${item.y}" width="${item.w}" height="${nodeH}" rx="10" fill="#ffffff" stroke="#5b8db8" stroke-width="1.5"/>
      <text font-size="15" font-weight="600" fill="#1f2937" text-anchor="middle">${textSvg(item.node.text, nodeCx, item.y + 25, 18)}</text>${childShapes}`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#64748b"/></marker></defs>
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="${width / 2}" y="34" text-anchor="middle" font-size="22" font-weight="700" fill="#102a43">${esc(projectConfig.figureTitle || metadata.title || '基础流程图')}</text>
    ${stageRects}${nodeShapes}
    <text x="${width / 2}" y="${height - 26}" text-anchor="middle" font-size="16" font-weight="700" fill="#334155">${esc(title)}</text>
  </svg>`
}
