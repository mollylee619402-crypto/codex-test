import { SITE_SURVEY_REPORT_LAYOUT } from './reportDiagramTemplates.js'

const FONT_FAMILY = 'SimSun, Songti SC, STSong, "Noto Serif CJK SC", "Microsoft YaHei", serif'
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

function rect({ x, y, width, height, dashed = false, fill = '#ffffff', stroke = STROKE, strokeWidth = 1.4 }) {
  const dash = dashed ? ' stroke-dasharray="7 5"' : ''
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}/>`
}

function node({ label, x, y, width, height, dashed = false }) {
  return `<g class="report-node">${rect({ x, y, width, height, dashed })}${text(label, x + width / 2, y + height / 2, { size: 18 })}</g>`
}

function arrow(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${STROKE}" stroke-width="1.4" marker-end="url(#arrow-head)"/>`
}

function renderSiteSurveySvg(metadata = {}) {
  const layout = SITE_SURVEY_REPORT_LAYOUT
  const { node: nodeBox, group } = layout
  const centerX = nodeBox.x + nodeBox.width / 2
  const parts = []

  layout.nodes.slice(0, 4).forEach((item) => {
    parts.push(node({ ...item, x: nodeBox.x, width: nodeBox.width, height: nodeBox.height }))
  })

  parts.push(rect({ x: group.x, y: group.y, width: group.width, height: group.height, strokeWidth: 1.4 }))
  parts.push(text(group.label, group.x + group.width / 2, group.y + 19, { size: 18, bold: true }))
  parts.push(`<line x1="${group.x}" y1="${group.y + group.titleHeight}" x2="${group.x + group.width}" y2="${group.y + group.titleHeight}" stroke="${STROKE}" stroke-width="1.1"/>`)
  group.children.forEach((child) => parts.push(node(child)))

  layout.nodes.slice(4).forEach((item) => {
    parts.push(node({ ...item, x: nodeBox.x, width: nodeBox.width, height: nodeBox.height }))
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
    parts.push(arrow(centerX, current.bottom + 2, centerX, next.top - 4))
  })

  const caption = metadata.caption || layout.caption
  parts.push(text(caption, layout.width / 2, 790, { size: 20, bold: true }))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-label="${escapeXml(caption)}">
  <defs>
    <marker id="arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${STROKE}"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#ffffff"/>
  <g class="report-diagram" shape-rendering="geometricPrecision">
    ${parts.join('\n    ')}
  </g>
</svg>`
}

function renderTechnicalServiceSvg(metadata = {}) {
  const width = 900
  const height = 560
  const caption = metadata.caption || '图4-1 本项目技术服务工作流程'
  const phases = [
    ['进场准备阶段', ['中标通知书', '入驻现场', '初期资料整理'], '进场准备完成'],
    ['场地调查阶段', ['水文地质勘察', '调查实施方案', '采样检测', '结果分析'], '场地调查报告'],
    ['风险评估阶段', ['土地利用方式', '关注污染物', '健康风险计算'], '风险评估报告'],
    ['工程可研阶段', ['工艺筛选', '技术路线', '投资估算'], '可研报告']
  ]
  const parts = []
  phases.forEach((phase, index) => {
    const x = 40 + index * 215
    parts.push(rect({ x, y: 42, width: 178, height: 390, dashed: true, strokeWidth: 1.2 }))
    parts.push(text(phase[0], x + 89, 70, { size: 16, bold: true }))
    phase[1].forEach((label, stepIndex) => parts.push(node({ label, x: x + 24, y: 105 + stepIndex * 62, width: 130, height: 38 })))
    parts.push(node({ label: phase[2], x: x + 24, y: 366, width: 130, height: 42 }))
    if (index < phases.length - 1) parts.push(arrow(x + 178, 240, x + 212, 240))
  })
  parts.push(text(caption, width / 2, 500, { size: 18, bold: true }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="${STROKE}"/></marker></defs><rect width="${width}" height="${height}" fill="#fff"/><g>${parts.join('')}</g></svg>`
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
  if (templateType === 'site-survey') return renderSiteSurveySvg(metadata)
  if (templateType === 'technical-service') return renderTechnicalServiceSvg(metadata)
  if (templateType === 'project-org') return renderProjectOrgSvg(metadata)
  return ''
}
