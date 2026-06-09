export const REPORT_SVG_TEMPLATE_TYPES = ['site-survey', 'technical-service', 'project-org']

export const REPORT_SVG_NOTICE = '该模板使用报告版 SVG 渲染，适合导出到 Word/PPT/Visio 后微调。'

export function isReportSvgTemplate(templateType) {
  return REPORT_SVG_TEMPLATE_TYPES.includes(templateType)
}

export const SITE_SURVEY_REPORT_LAYOUT = {
  width: 620,
  height: 780,
  caption: '图3-2 资料收集分析与踏勘工作流程图',
  node: { x: 180, width: 260, height: 46 },
  nodes: [
    { id: 'target', label: '确定调查对象', y: 38 },
    { id: 'prepare', label: '工作准备', y: 108 },
    { id: 'verify', label: '基本信息核实', y: 178 },
    { id: 'collect', label: '资料收集', y: 248 },
    { id: 'organize', label: '信息整理与分析', y: 570 },
    { id: 'risk', label: '风险筛查与下步计划', y: 640, dashed: true }
  ],
  group: {
    id: 'survey',
    label: '现场勘查',
    x: 110,
    y: 318,
    width: 400,
    height: 220,
    titleHeight: 44,
    children: [
      { label: '现场踏勘', x: 155, y: 376, width: 100, height: 145 },
      { label: '人员访谈', x: 365, y: 376, width: 100, height: 145 }
    ]
  },
  captionY: 735
}
