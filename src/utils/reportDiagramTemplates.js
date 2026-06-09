export const REPORT_SVG_TEMPLATE_TYPES = ['site-survey', 'technical-service', 'project-org']

export const REPORT_SVG_NOTICE = '该模板使用报告版 SVG 渲染，适合导出到 Word/PPT/Visio 后微调。'

export function isReportSvgTemplate(templateType) {
  return REPORT_SVG_TEMPLATE_TYPES.includes(templateType)
}

export const SITE_SURVEY_REPORT_LAYOUT = {
  width: 620,
  height: 680,
  caption: '图3-2 资料收集分析与踏勘工作流程图',
  node: { x: 190, width: 240, height: 42 },
  nodes: [
    { id: 'target', label: '确定调查对象', y: 32 },
    { id: 'prepare', label: '工作准备', y: 96 },
    { id: 'verify', label: '基本信息核实', y: 160 },
    { id: 'collect', label: '资料收集', y: 224 },
    { id: 'organize', label: '信息整理与分析', y: 506 },
    { id: 'risk', label: '风险筛查与下步计划', y: 570, dashed: true }
  ],
  group: {
    id: 'survey',
    label: '现场勘查',
    x: 90,
    y: 286,
    width: 440,
    height: 190,
    titleHeight: 40,
    children: [
      { label: '现场踏勘', x: 160, y: 340, width: 110, height: 120 },
      { label: '人员访谈', x: 350, y: 340, width: 110, height: 120 }
    ]
  },
  captionY: 652
}
