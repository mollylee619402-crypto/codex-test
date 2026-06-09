import pptxgen from 'pptxgenjs'
import { fileNameFromTitle } from './fileName.js'
import { SITE_SURVEY_REPORT_LAYOUT } from './reportDiagramTemplates.js'

const PALETTE = {
  phase: { fill: 'F6F9FC', line: '9AAFC1' },
  process: { fill: 'F8FAFC', line: '94A3B8' },
  start: { fill: 'DBEAFE', line: '3B82F6' },
  decision: { fill: 'FEF3C7', line: 'D97706' },
  output: { fill: 'E0F2FE', line: '0284C7' },
  document: { fill: 'EAF7EF', line: '4B9270' },
  risk: { fill: 'FEE2E2', line: 'F97316' },
  org: { fill: 'E8EEF6', line: '6686A8' },
  leader: { fill: 'DDEBFA', line: '356EA5' },
  team: { fill: 'EAF4EA', line: '63936A' },
  task: { fill: 'F4F6F8', line: 'A0AEC0' }
}

function splitLabelsFromMermaid(code) {
  const labels = []
  const pattern = /\bN\d+\s*(?:\[\"([^\"]+)\"\]|\{\"([^\"]+)\"\}|\(\[\"([^\"]+)\"\]\))/g
  let match = pattern.exec(code)
  while (match) {
    labels.push(match[1] || match[2] || match[3])
    match = pattern.exec(code)
  }
  return [...new Set(labels)].slice(0, 18)
}

function addTextBox(slide, text, x, y, w, h, opts = {}) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    margin: 0.06,
    fontFace: 'Microsoft YaHei',
    fontSize: opts.fontSize || 10,
    bold: opts.bold || false,
    color: opts.color || '1F2937',
    align: opts.align || 'center',
    valign: 'mid',
    fit: 'shrink'
  })
}

function addNode(slide, pptx, label, x, y, w, h, type = 'process') {
  const shapes = pptx.ShapeType
  const style = PALETTE[type] || PALETTE.process
  const isDecision = type === 'decision'
  slide.addShape(isDecision ? shapes.diamond : shapes.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.06,
    fill: { color: style.fill },
    line: { color: style.line, width: type === 'risk' ? 1.4 : 1.1, dash: type === 'risk' ? 'dash' : 'solid' }
  })
  addTextBox(slide, label, x + 0.04, y + 0.03, w - 0.08, h - 0.06, { fontSize: label.length > 12 ? 8.6 : 9.6, bold: ['start', 'output', 'document', 'leader'].includes(type) })
}

function addArrow(slide, pptx, x1, y1, x2, y2) {
  slide.addShape(pptx.ShapeType.line, {
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
    line: { color: '64748B', width: 1.1, beginArrowType: 'none', endArrowType: 'triangle' }
  })
}

function addPhase(slide, pptx, title, x, y, w, h) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.05,
    fill: { color: PALETTE.phase.fill, transparency: 20 },
    line: { color: PALETTE.phase.line, width: 1, dash: 'dash' }
  })
  addTextBox(slide, title, x + 0.05, y + 0.05, w - 0.1, 0.28, { align: 'left', bold: true, fontSize: 9.5, color: '334155' })
}

function drawLinear(slide, pptx, labels) {
  const list = labels.length ? labels : ['开始', '执行流程', '形成成果']
  const x = 4.2
  const y0 = 1.08
  const gap = Math.min(0.7, 5.15 / Math.max(list.length, 7))
  list.slice(0, 9).forEach((label, index, visible) => {
    const y = y0 + index * gap
    const type = index === 0 ? 'start' : index === visible.length - 1 ? 'output' : label.includes('风险') ? 'risk' : 'process'
    addNode(slide, pptx, label, x, y, 2.2, 0.42, type)
    if (index < visible.length - 1) addArrow(slide, pptx, x + 1.1, y + 0.42, x + 1.1, y + gap)
  })
}

function drawTechnicalService(slide, pptx) {
  const phases = [
    ['进场准备阶段', ['中标通知书', '入驻现场', '初期资料整理'], '阶段成果：进场准备完成'],
    ['场地调查阶段', ['水文地质勘察', '调查实施方案', '钻探建井/采样/检测', '结果分析'], '阶段成果：场地调查报告'],
    ['风险评估阶段', ['土地利用方式', '关注污染物', '环境受体与健康风险', '地下水风险'], '阶段成果：风险评估报告'],
    ['工程可行性研究阶段', ['工艺筛选', '总体技术路线', '目标值/环保管理', '投资估算'], '成果：工程可行性研究报告']
  ]
  phases.forEach((phase, index) => {
    const x = 0.55 + index * 3.05
    addPhase(slide, pptx, phase[0], x, 1.05, 2.65, 4.45)
    phase[1].forEach((label, stepIndex) => addNode(slide, pptx, label, x + 0.27, 1.55 + stepIndex * 0.68, 2.1, 0.42, 'process'))
    addNode(slide, pptx, phase[2], x + 0.27, 4.65, 2.1, 0.5, 'document')
    if (index < phases.length - 1) addArrow(slide, pptx, x + 2.65, 3.22, x + 3.05, 3.22)
  })
}

function drawOrg(slide, pptx) {
  addPhase(slide, pptx, '公司级支撑层', 0.55, 0.95, 12.2, 1.35)
  ;['质量部', '计划经营部', '财务部', '修复技术中心', '信息管理部', '设计研究院', '采购部', '综合管理部'].forEach((label, index) => {
    addNode(slide, pptx, label, 0.8 + index * 1.45, 1.45, 1.18, 0.38, 'org')
  })
  addNode(slide, pptx, '项目总负责人', 5.2, 2.65, 2.3, 0.5, 'leader')
  addArrow(slide, pptx, 6.35, 2.3, 6.35, 2.65)
  addPhase(slide, pptx, '项目实施层', 1.25, 3.45, 10.8, 2.3)
  addNode(slide, pptx, '场调和风评工作组', 2.25, 3.75, 2.2, 0.45, 'team')
  addNode(slide, pptx, '可研设计组', 8.0, 3.75, 2.2, 0.45, 'team')
  addNode(slide, pptx, '场调风评负责人', 2.25, 4.45, 2.2, 0.42, 'leader')
  addNode(slide, pptx, '可研设计负责人', 8.0, 4.45, 2.2, 0.42, 'leader')
  ;['现场工作组', '技术支持组', '勘察工作组', '试验组'].forEach((label, index) => addNode(slide, pptx, label, 0.95 + index * 1.35, 5.13, 1.18, 0.36, 'task'))
  ;['修复工艺设计组', '废水处理工艺组', '技经组', '药剂研发组'].forEach((label, index) => addNode(slide, pptx, label, 7.0 + index * 1.35, 5.13, 1.18, 0.36, 'task'))
  addArrow(slide, pptx, 6.35, 3.15, 3.35, 3.75)
  addArrow(slide, pptx, 6.35, 3.15, 9.1, 3.75)
}

function addReportText(slide, text, x, y, w, h, opts = {}) {
  slide.addText(text, {
    x,
    y,
    w,
    h,
    margin: opts.margin ?? 0.04,
    fontFace: 'SimSun',
    fontSize: opts.fontSize || 11,
    bold: opts.bold || false,
    color: opts.color || '111111',
    align: opts.align || 'center',
    valign: 'mid',
    fit: 'shrink'
  })
}

function addReportNode(slide, pptx, label, x, y, w, h, opts = {}) {
  slide.addShape(pptx.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: 'FFFFFF' },
    line: { color: '111111', width: opts.dashed ? 1.2 : 1, dash: opts.dashed ? 'dash' : 'solid' }
  })
  addReportText(slide, label, x + 0.03, y + 0.02, w - 0.06, h - 0.04, { fontSize: opts.fontSize || 11, bold: opts.bold || false })
}

function addReportArrow(slide, pptx, x1, y1, x2, y2) {
  slide.addShape(pptx.ShapeType.line, {
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
    line: { color: '111111', width: 1, beginArrowType: 'none', endArrowType: 'triangle' }
  })
}

function drawSiteSurveyReport(slide, pptx, metadata) {
  const layout = SITE_SURVEY_REPORT_LAYOUT
  const scale = 6.8 / layout.height
  const offsetX = (13.333 - layout.width * scale) / 2
  const offsetY = 0.18
  const toX = (value) => offsetX + value * scale
  const toY = (value) => offsetY + value * scale
  const toW = (value) => value * scale
  const toH = (value) => value * scale
  const { node: nodeBox, group } = layout
  const centerX = nodeBox.x + nodeBox.width / 2

  layout.nodes.slice(0, 4).forEach((item) => {
    addReportNode(slide, pptx, item.label, toX(nodeBox.x), toY(item.y), toW(nodeBox.width), toH(nodeBox.height), { fontSize: 11 })
  })

  slide.addShape(pptx.ShapeType.rect, {
    x: toX(group.x),
    y: toY(group.y),
    w: toW(group.width),
    h: toH(group.height),
    fill: { color: 'FFFFFF' },
    line: { color: '111111', width: 1 }
  })
  addReportText(slide, group.label, toX(group.x), toY(group.y), toW(group.width), toH(group.titleHeight), { fontSize: 11, bold: true })
  slide.addShape(pptx.ShapeType.line, {
    x: toX(group.x),
    y: toY(group.y + group.titleHeight),
    w: toW(group.width),
    h: 0,
    line: { color: '111111', width: 0.75 }
  })
  group.children.forEach((child) => {
    addReportNode(slide, pptx, child.label, toX(child.x), toY(child.y), toW(child.width), toH(child.height), { fontSize: 11 })
  })

  layout.nodes.slice(4).forEach((item) => {
    addReportNode(slide, pptx, item.label, toX(nodeBox.x), toY(item.y), toW(nodeBox.width), toH(nodeBox.height), { dashed: item.dashed, fontSize: 11 })
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
    addReportArrow(slide, pptx, toX(centerX), toY(current.bottom + 4), toX(centerX), toY(next.top - 6))
  })

  addReportText(
    slide,
    metadata.caption || layout.caption,
    0.6,
    toY(layout.captionY) - 0.08,
    12.1,
    0.32,
    { fontSize: 13, bold: true }
  )
}

function addInfoSlide(slide, metadata, summary) {
  slide.background = { color: 'F8FAFC' }
  slide.addText('流程说明与导出说明', { x: 0.55, y: 0.35, w: 12.1, h: 0.35, fontFace: 'Microsoft YaHei', fontSize: 20, bold: true, color: '1E3A5F' })
  const text = [
    metadata.description,
    '',
    `关键控制节点：\n• ${metadata.controls.join('\n• ')}`,
    '',
    `风险或异常节点说明：\n• ${metadata.riskNotes.join('\n• ')}`,
    '',
    '说明：本 PPTX 为结构化近似版，使用 PowerPoint 原生形状、线条与文本框生成，便于后续继续编辑。复杂 Mermaid 布局会近似重建。',
    '',
    ...(summary || [])
  ].join('\n')
  slide.addText(text, { x: 0.75, y: 1.0, w: 11.85, h: 5.7, fontFace: 'Microsoft YaHei', fontSize: 12, color: '334155', breakLine: false, fit: 'shrink', valign: 'top', margin: 0.1, bullet: false })
}

export async function downloadEditablePptx({ mermaidCode, metadata, summary, diagramType }) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'FlowCraft'
  pptx.subject = '环保工程流程图与组织架构图'
  pptx.title = metadata.title
  pptx.company = 'FlowCraft'
  pptx.lang = 'zh-CN'

  const slide = pptx.addSlide()
  slide.background = { color: 'FFFFFF' }

  if (diagramType === 'site-survey') {
    drawSiteSurveyReport(slide, pptx, metadata)
  } else {
    slide.addText(metadata.title, { x: 0.45, y: 0.25, w: 12.4, h: 0.35, fontFace: 'Microsoft YaHei', fontSize: 18, bold: true, color: '17324D', align: 'center' })

    if (diagramType === 'technical-service') drawTechnicalService(slide, pptx)
    else if (diagramType === 'project-org') drawOrg(slide, pptx)
    else drawLinear(slide, pptx, splitLabelsFromMermaid(mermaidCode))

    slide.addText(metadata.caption, { x: 0.45, y: 6.55, w: 12.4, h: 0.3, fontFace: 'Microsoft YaHei', fontSize: 12, bold: true, color: '334155', align: 'center' })
  }
  addInfoSlide(pptx.addSlide(), metadata, summary)

  await pptx.writeFile({ fileName: fileNameFromTitle(metadata.title, 'pptx') })
}
