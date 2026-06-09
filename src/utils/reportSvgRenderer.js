import { SITE_SURVEY_REPORT_LAYOUT, TECHNICAL_SERVICE_REPORT_LAYOUT } from './reportDiagramTemplates.js'

const FONT_FAMILY = "SimSun, 'Songti SC', 'Microsoft YaHei', serif"
const TEXT_FILL = '#111111'
const STROKE = '#111111'

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function text(label, x, y, options = {}) {
  const weight = options.bold ? ' font-weight="700"' : ''
  const size = options.size || 18
  const anchor = options.anchor || 'middle'
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-family="${FONT_FAMILY}" font-size="${size}" fill="${TEXT_FILL}"${weight}>${escapeXml(label)}</text>`
}

function rect({ x, y, width, height, dashed = false, fill = '#ffffff', stroke = STROKE, strokeWidth = 1.4, dashArray = '7 5' }) {
  const dash = dashed ? ` stroke-dasharray="${dashArray}"` : ''
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}/>`
}

function wrapLabel(label, maxChars = 12) {
  const source = String(label || '')
  if (source.length <= maxChars) return [source]

  const lines = []
  let current = ''
  Array.from(source).forEach((char) => {
    current += char
    if (current.length >= maxChars || /[，、（）]/.test(char)) {
      lines.push(current)
      current = ''
    }
  })
  if (current) lines.push(current)
  return lines.slice(0, 3)
}

function multiLineText(label, x, y, options = {}) {
  const weight = options.bold ? ' font-weight="700"' : ''
  const size = options.size || 18
  const anchor = options.anchor || 'middle'
  const lines = wrapLabel(label, options.maxChars || 12)
  const lineHeight = options.lineHeight || Math.round(size * 1.25)
  const startDy = -((lines.length - 1) * lineHeight) / 2
  const tspans = lines.map((line, index) => {
    const dy = index === 0 ? startDy : lineHeight
    return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`
  }).join('')
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-family="${FONT_FAMILY}" font-size="${size}" fill="${TEXT_FILL}"${weight}>${tspans}</text>`
}

function node({ label, x, y, width, height, dashed = false, textSize = 18, fill = '#ffffff', stroke = STROKE, maxChars }) {
  const strokeWidth = dashed ? 1.3 : 1.4
  return `<g>${rect({ x, y, width, height, dashed, strokeWidth, dashArray: '6 4', fill, stroke })}${multiLineText(label, x + width / 2, y + height / 2, { size: textSize, maxChars })}</g>`
}

function arrow(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${STROKE}" stroke-width="1.4" marker-end="url(#arrow-head)"/>`
}

function reportArrow(x1, y1, x2, y2) {
  const arrowSize = 8

  if (x1 === x2) {
    const direction = y2 >= y1 ? 1 : -1
    const lineEndY = y2 - direction * arrowSize
    const tip = y2
    const base = lineEndY
    return [
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${lineEndY}" stroke="${STROKE}" stroke-width="1.2"/>`,
      `<polygon points="${x2},${tip} ${x2 - 5},${base} ${x2 + 5},${base}" fill="${STROKE}"/>`
    ].join('')
  }

  if (y1 === y2) {
    const direction = x2 >= x1 ? 1 : -1
    const lineEndX = x2 - direction * arrowSize
    const tip = x2
    const base = lineEndX
    return [
      `<line x1="${x1}" y1="${y1}" x2="${lineEndX}" y2="${y2}" stroke="${STROKE}" stroke-width="1.2"/>`,
      `<polygon points="${tip},${y2} ${base},${y2 - 5} ${base},${y2 + 5}" fill="${STROKE}"/>`
    ].join('')
  }

  const midY = y1 + (y2 - y1) / 2
  const direction = y2 >= y1 ? 1 : -1
  const lineEndY = y2 - direction * arrowSize
  return [
    `<polyline points="${x1},${y1} ${x1},${midY} ${x2},${midY} ${x2},${lineEndY}" fill="none" stroke="${STROKE}" stroke-width="1.2"/>`,
    `<polygon points="${x2},${y2} ${x2 - 5},${lineEndY} ${x2 + 5},${lineEndY}" fill="${STROKE}"/>`
  ].join('')
}

function arrowHeadForSegment(start, end, size = 8, half = 5) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const base = { x: end.x - ux * size, y: end.y - uy * size }
  const px = -uy * half
  const py = ux * half
  return {
    lineEnd: base,
    polygon: `${end.x},${end.y} ${base.x + px},${base.y + py} ${base.x - px},${base.y - py}`
  }
}

function drawPolylineArrow(points, options = {}) {
  if (!Array.isArray(points) || points.length < 2) return ''
  const normalized = points.map(([x, y]) => ({ x, y }))
  const last = normalized[normalized.length - 1]
  const beforeLast = normalized[normalized.length - 2]
  const { lineEnd, polygon } = arrowHeadForSegment(beforeLast, last, options.arrowSize || 8, options.arrowHalf || 5)
  const linePoints = normalized.slice(0, -1).concat(lineEnd).map((point) => `${point.x},${point.y}`).join(' ')
  return [
    `<polyline points="${linePoints}" fill="none" stroke="${options.stroke || STROKE}" stroke-width="${options.strokeWidth || 1.2}" stroke-linejoin="miter" stroke-linecap="butt"/>`,
    `<polygon points="${polygon}" fill="${options.stroke || STROKE}"/>`
  ].join('')
}

function drawLineArrow(x1, y1, x2, y2, options = {}) {
  return drawPolylineArrow([[x1, y1], [x2, y2]], options)
}

function drawNode(item, options = {}) {
  return node({ ...item, ...options })
}

function drawPhaseBox(stage, layout) {
  return rect({
    x: stage.x,
    y: stage.y,
    width: stage.width,
    height: stage.height,
    fill: '#ffffff',
    stroke: layout.stageStroke,
    strokeWidth: 1.8,
    dashed: true,
    dashArray: layout.stageDashArray
  })
}

function drawCaption(caption, x, y, options = {}) {
  return text(caption, x, y, { size: 18, bold: true, ...options })
}

function renderSiteSurveySvg(metadata = {}) {
  const layout = SITE_SURVEY_REPORT_LAYOUT
  const { node: nodeBox, group } = layout
  const centerX = nodeBox.x + nodeBox.width / 2
  const parts = []

  layout.nodes.slice(0, 4).forEach((item) => {
    parts.push(node({ ...item, x: nodeBox.x, width: nodeBox.width, height: nodeBox.height, textSize: 16 }))
  })

  parts.push(rect({ x: group.x, y: group.y, width: group.width, height: group.height, strokeWidth: 1.3 }))
  parts.push(text(group.label, group.x + group.width / 2, group.y + group.titleHeight / 2, { size: 17, bold: true }))
  group.children.forEach((child) => parts.push(node({ ...child, textSize: 16 })))

  layout.nodes.slice(4).forEach((item) => {
    parts.push(node({ ...item, x: nodeBox.x, width: nodeBox.width, height: nodeBox.height, textSize: 16 }))
  })

  const flowStops = [
    { top: layout.nodes[0].y, bottom: layout.nodes[0].y + nodeBox.height },
    { top: layout.nodes[1].y, bottom: layout.nodes[1].y + nodeBox.height },
    { top: layout.nodes[2].y, bottom: layout.nodes[2].y + nodeBox.height },
    { top: layout.nodes[3].y, bottom: layout.nodes[3].y + nodeBox.height },
    { top: group.y, bottom: group.y + group.height },
    { top: layout.nodes[4].y, bottom: layout.nodes[4].y + nodeBox.height },
    { top: layout.nodes[5].y, bottom: layout.nodes[5].y + nodeBox.height }
  ]

  flowStops.slice(0, -1).forEach((current, index) => {
    const next = flowStops[index + 1]
    parts.push(reportArrow(centerX, current.bottom + 4, centerX, next.top - 6))
  })

  const caption = metadata.caption || layout.caption
  parts.push(text(caption, layout.width / 2, layout.captionY, { size: 18, bold: true }))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeXml(caption)}">
  <rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#ffffff"/>
  <g>
    ${parts.join('\n    ')}
  </g>
</svg>`
}

function renderVerticalLabel(label, x, y, size = 16) {
  const chars = Array.from(label)
  const lineHeight = size + 1
  const tspans = chars.map((char, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(char)}</tspan>`).join('')
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT_FAMILY}" font-size="${size}" fill="#b32626" font-weight="700">${tspans}</text>`
}


function getNodeCenter(item, side = 'center') {
  if (side === 'top') return { x: item.x + item.width / 2, y: item.y }
  if (side === 'bottom') return { x: item.x + item.width / 2, y: item.y + item.height }
  if (side === 'left') return { x: item.x, y: item.y + item.height / 2 }
  if (side === 'right') return { x: item.x + item.width, y: item.y + item.height / 2 }
  return { x: item.x + item.width / 2, y: item.y + item.height / 2 }
}

function smartArrow(from, to) {
  const fromCenter = getNodeCenter(from)
  const toCenter = getNodeCenter(to)
  const verticalPreferred = Math.abs(fromCenter.x - toCenter.x) < Math.max(from.width, to.width) * 0.65 || fromCenter.y < to.y

  if (verticalPreferred) {
    const start = getNodeCenter(from, 'bottom')
    const end = getNodeCenter(to, 'top')
    if (Math.abs(start.x - end.x) < 0.1) return drawLineArrow(start.x, start.y + 4, end.x, end.y - 4)
    const midY = start.y + (end.y - start.y) / 2
    return drawPolylineArrow([[start.x, start.y + 4], [start.x, midY], [end.x, midY], [end.x, end.y - 4]])
  }

  const leftToRight = fromCenter.x < toCenter.x
  const start = getNodeCenter(from, leftToRight ? 'right' : 'left')
  const end = getNodeCenter(to, leftToRight ? 'left' : 'right')
  return drawLineArrow(start.x + (leftToRight ? 4 : -4), start.y, end.x + (leftToRight ? -4 : 4), end.y)
}


function renderTechnicalServiceSvg(metadata = {}) {
  const layout = TECHNICAL_SERVICE_REPORT_LAYOUT
  const caption = metadata.caption || layout.caption
  const nodeById = Object.fromEntries(layout.nodes.map((item) => [item.id, item]))
  const colorByStage = Object.fromEntries(layout.stages.map((stage) => [stage.id, stage.color]))
  const parts = []

  layout.stages.forEach((stage) => {
    parts.push(drawPhaseBox(stage, layout))
    parts.push(renderVerticalLabel(stage.label, stage.labelX, stage.labelY, stage.label.length > 10 ? 14 : 16))
  })

  layout.nodes.forEach((item) => {
    parts.push(drawNode(item, {
      fill: colorByStage[item.stage] || '#ffffff',
      stroke: '#333333',
      textSize: item.small ? 15 : 16,
      maxChars: item.small ? 10 : 12
    }))
  })

  layout.arrows.forEach(([fromId, toId]) => {
    const from = nodeById[fromId]
    const to = nodeById[toId]
    if (from && to) parts.push(smartArrow(from, to))
  })

  ;(layout.routedArrows || []).forEach((route) => {
    parts.push(drawPolylineArrow(route.points))
  })

  parts.push(drawCaption(caption, layout.width / 2, layout.captionY, { size: 16, bold: true }))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeXml(caption)}">
  <rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#ffffff"/>
  <g>
    ${parts.join('\n    ')}
  </g>
</svg>`
}

function renderProjectOrgSvg(metadata = {}) {
  const width = 900
  const height = 560
  const caption = metadata.caption || '图1-1 项目管理机构组织架构图'
  const parts = []
  const orgs = ['质量部', '计划经营部', '财务部', '技术中心', '设计院', '采购部']
  parts.push(rect({ x: 60, y: 42, width: 780, height: 92, dashed: true, strokeWidth: 1.2 }))
  parts.push(text('公司级支撑层', 450, 64, { size: 16, bold: true }))
  orgs.forEach((label, index) => parts.push(node({ label, x: 90 + index * 120, y: 82, width: 92, height: 32 })))
  parts.push(node({ label: '项目总负责人', x: 365, y: 180, width: 170, height: 44 }))
  parts.push(arrow(450, 134, 450, 180))
  parts.push(node({ label: '场调和风评工作组', x: 190, y: 290, width: 170, height: 42 }))
  parts.push(node({ label: '可研设计组', x: 540, y: 290, width: 170, height: 42 }))
  parts.push(arrow(450, 224, 275, 290))
  parts.push(arrow(450, 224, 625, 290))
  ;['现场工作组', '技术支持组', '勘察工作组'].forEach((label, index) => parts.push(node({ label, x: 115 + index * 110, y: 378, width: 92, height: 32 })))
  ;['工艺设计组', '废水处理组', '技经组'].forEach((label, index) => parts.push(node({ label, x: 470 + index * 110, y: 378, width: 92, height: 32 })))
  parts.push(text(caption, width / 2, 500, { size: 18, bold: true }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${STROKE}"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/><g>${parts.join('')}</g></svg>`
}

export function renderReportSvg(templateType, input, metadata = {}) {
  if (templateType === 'site-survey' || templateType === '资料收集与踏勘流程图') return renderSiteSurveySvg(metadata)
  if (templateType === 'technical-service' || templateType === '技术服务总体流程图') return renderTechnicalServiceSvg(metadata)
  if (templateType === 'project-org') return renderProjectOrgSvg(metadata)
  return ''
}
