export const REPORT_SVG_TEMPLATE_TYPES = ['site-survey', 'technical-service', '技术服务总体流程图', 'project-org']

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

export const TECHNICAL_SERVICE_REPORT_LAYOUT = {
  width: 1000,
  height: 1900,
  caption: '图4-1 本项目技术服务工作流程',
  stageStroke: '#d94a4a',
  stageDashArray: '10 7',
  stages: [
    { id: 'prepare', label: '进场准备阶段', x: 50, y: 30, width: 840, height: 280, color: '#dcecff', labelX: 925, labelY: 96 },
    { id: 'survey', label: '场地调查服务阶段', x: 50, y: 335, width: 840, height: 625, color: '#ffe6cc', labelX: 925, labelY: 428 },
    { id: 'risk', label: '场地调查及风险评估阶段', x: 50, y: 985, width: 840, height: 520, color: '#fff2b8', labelX: 925, labelY: 1068 },
    { id: 'feasibility', label: '工程可行性研究阶段', x: 50, y: 1530, width: 840, height: 310, color: '#edf0f3', labelX: 925, labelY: 1588 }
  ],
  nodes: [
    { id: 'notice', stage: 'prepare', label: '收到中标通知书', x: 340, y: 60, width: 220, height: 46 },
    { id: 'site', stage: 'prepare', label: '入驻现场', x: 340, y: 125, width: 220, height: 46 },
    { id: 'collect', stage: 'prepare', label: '收集和整理分析前期资料', x: 340, y: 205, width: 220, height: 54 },
    { id: 'eia', stage: 'prepare', label: '企业历年环评资料', x: 620, y: 82, width: 220, height: 38, small: true },
    { id: 'around', stage: 'prepare', label: '周边工业企业环评资料', x: 620, y: 128, width: 220, height: 38, small: true },
    { id: 'history', stage: 'prepare', label: '场地历史变迁资料', x: 620, y: 174, width: 220, height: 38, small: true },
    { id: 'planning', stage: 'prepare', label: '用地规划及环境功能区划资料', x: 620, y: 220, width: 220, height: 38, small: true },

    { id: 'survey-entry', stage: 'survey', label: '进入场地调查服务阶段', x: 340, y: 365, width: 220, height: 48 },
    { id: 'hydro', stage: 'survey', label: '水文地质勘察与测绘', x: 340, y: 440, width: 220, height: 48 },
    { id: 'plan', stage: 'survey', label: '制定场地调查实施方案', x: 340, y: 515, width: 220, height: 48 },
    { id: 'field', stage: 'survey', label: '场地调查现场工作（分阶段开展）', x: 340, y: 590, width: 220, height: 56 },
    { id: 'drill', stage: 'survey', label: '现场钻探及建井作业', x: 620, y: 535, width: 220, height: 38, small: true },
    { id: 'sample', stage: 'survey', label: '现场采样、送检', x: 620, y: 581, width: 220, height: 38, small: true },
    { id: 'record', stage: 'survey', label: '现场分析及记录', x: 620, y: 627, width: 220, height: 38, small: true },
    { id: 'lab', stage: 'survey', label: '实验室检测分析', x: 620, y: 673, width: 220, height: 38, small: true },
    { id: 'analysis', stage: 'survey', label: '结果分析和场调报告编制', x: 340, y: 725, width: 220, height: 54 },
    { id: 'model', stage: 'survey', label: '构建场地水文地质概念模型', x: 100, y: 810, width: 230, height: 54 },
    { id: 'gw', stage: 'survey', label: '确定地下水污染的污染因子及影响程度', x: 385, y: 810, width: 230, height: 54 },
    { id: 'soil', stage: 'survey', label: '确定土壤污染的污染因子及影响程度', x: 670, y: 810, width: 180, height: 54 },
    { id: 'detail-report', stage: 'survey', label: '场地详细调查报告', x: 250, y: 895, width: 210, height: 44 },
    { id: 'survey-review', stage: 'survey', label: '通过专家及主管部门审查', x: 540, y: 895, width: 230, height: 44 },

    { id: 'risk-entry', stage: 'risk', label: '进入风险评估阶段', x: 340, y: 1018, width: 220, height: 48 },
    { id: 'land', stage: 'risk', label: '土地利用方式', x: 160, y: 1090, width: 200, height: 38, small: true },
    { id: 'survey-data', stage: 'risk', label: '分析场调资料', x: 160, y: 1138, width: 200, height: 38, small: true },
    { id: 'property', stage: 'risk', label: '污染物理化特性', x: 160, y: 1186, width: 200, height: 38, small: true },
    { id: 'concern', stage: 'risk', label: '关注污染物', x: 160, y: 1234, width: 200, height: 38, small: true },
    { id: 'receptor', stage: 'risk', label: '环境受体分析', x: 540, y: 1090, width: 200, height: 38, small: true },
    { id: 'water', stage: 'risk', label: '周边水体', x: 540, y: 1138, width: 200, height: 38, small: true },
    { id: 'health', stage: 'risk', label: '人体健康', x: 540, y: 1186, width: 200, height: 38, small: true },
    { id: 'groundwater', stage: 'risk', label: '地下水', x: 540, y: 1234, width: 200, height: 38, small: true },
    { id: 'exposure', stage: 'risk', label: '暴露评估、毒性评估', x: 340, y: 1295, width: 220, height: 44 },
    { id: 'risk-analysis', stage: 'risk', label: '风险表征分析', x: 340, y: 1350, width: 220, height: 44 },
    { id: 'control', stage: 'risk', label: '风险控制值计算', x: 340, y: 1405, width: 220, height: 44 },
    { id: 'risk-report', stage: 'risk', label: '风险评估报告', x: 250, y: 1460, width: 200, height: 42 },
    { id: 'risk-review', stage: 'risk', label: '通过专家及主管部门审查', x: 540, y: 1460, width: 230, height: 42 },

    { id: 'feas-entry', stage: 'feasibility', label: '进入工程可行性研究报告编制阶段', x: 320, y: 1558, width: 260, height: 50 },
    { id: 'process-select', stage: 'feasibility', label: '修复工艺筛选', x: 90, y: 1630, width: 170, height: 38, small: true },
    { id: 'route', stage: 'feasibility', label: '总体技术路线确定', x: 300, y: 1630, width: 170, height: 38, small: true },
    { id: 'target', stage: 'feasibility', label: '修复目标值确定', x: 510, y: 1630, width: 170, height: 38, small: true },
    { id: 'quantity', stage: 'feasibility', label: '修复与风险管控工程量确定', x: 700, y: 1630, width: 160, height: 38, small: true },
    { id: 'investment', stage: 'feasibility', label: '投资估算与效益分析', x: 190, y: 1690, width: 190, height: 38, small: true },
    { id: 'management', stage: 'feasibility', label: '环境保护管理', x: 415, y: 1690, width: 170, height: 38, small: true },
    { id: 'organization', stage: 'feasibility', label: '项目组织与实施', x: 620, y: 1690, width: 170, height: 38, small: true },
    { id: 'feas-report', stage: 'feasibility', label: '工程可行性研究报告', x: 245, y: 1760, width: 220, height: 42 },
    { id: 'approval', stage: 'feasibility', label: '项目发改立项', x: 545, y: 1760, width: 180, height: 42 }
  ],
  arrows: [
    ['notice', 'site'], ['site', 'collect'], ['collect', 'history'], ['collect', 'survey-entry'],
    ['survey-entry', 'hydro'], ['hydro', 'plan'], ['plan', 'field'], ['field', 'sample'], ['field', 'analysis'],
    ['analysis', 'model'], ['analysis', 'gw'], ['analysis', 'soil'], ['model', 'detail-report'], ['gw', 'detail-report'], ['soil', 'survey-review'], ['detail-report', 'survey-review'], ['survey-review', 'risk-entry'],
    ['risk-entry', 'land'], ['risk-entry', 'receptor'], ['land', 'exposure'], ['survey-data', 'exposure'], ['property', 'exposure'], ['concern', 'exposure'], ['receptor', 'exposure'], ['water', 'exposure'], ['health', 'exposure'], ['groundwater', 'exposure'],
    ['exposure', 'risk-analysis'], ['risk-analysis', 'control'], ['control', 'risk-report'], ['risk-report', 'risk-review'], ['risk-review', 'feas-entry'],
    ['feas-entry', 'route'], ['feas-entry', 'investment'], ['process-select', 'feas-report'], ['route', 'feas-report'], ['target', 'feas-report'], ['quantity', 'approval'], ['investment', 'feas-report'], ['management', 'feas-report'], ['organization', 'approval'], ['feas-report', 'approval']
  ],
  captionY: 1880
}
