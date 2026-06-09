export const REPORT_SVG_TEMPLATE_TYPES = ['site-survey', 'technical-service', 'project-org']

export const REPORT_SVG_NOTICE = '该模板使用报告版 SVG 渲染，适合导出到 Word/PPT/Visio 后微调。'

export function isReportSvgTemplate(templateType) {
  return REPORT_SVG_TEMPLATE_TYPES.includes(templateType)
}

export const SITE_SURVEY_REPORT_LAYOUT = {
  width: 820,
  height: 840,
  caption: '图3-2 资料收集分析与踏勘工作流程图',
  node: { x: 285, width: 250, height: 46 },
  nodes: [
    { id: 'target', label: '确定调查对象', y: 46 },
    { id: 'prepare', label: '工作准备', y: 128 },
    { id: 'verify', label: '基本信息核实', y: 210 },
    { id: 'collect', label: '资料收集', y: 292 },
    { id: 'organize', label: '信息整理与分析', y: 574 },
    { id: 'risk', label: '风险筛查与下步计划', y: 656, dashed: true }
  ],
  group: {
    id: 'survey',
    label: '现场勘查',
    x: 245,
    y: 374,
    width: 330,
    height: 150,
    titleHeight: 36,
    children: [
      { label: '现场踏勘', x: 280, y: 430, width: 115, height: 54 },
      { label: '人员访谈', x: 425, y: 430, width: 115, height: 54 }
    ]
  }
}
