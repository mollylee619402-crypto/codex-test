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
  width: 1040,
  height: 1870,
  caption: '图4-1 本项目技术服务工作流程',
  stageStroke: '#d94a4a',
  stageDashArray: '10 7',
  stages: [
    { id: 'prepare', label: '进场准备阶段', x: 50, y: 30, width: 930, height: 280, color: '#dcecff', labelX: 945, labelY: 96 },
    { id: 'survey', label: '场地调查服务阶段', x: 50, y: 335, width: 930, height: 620, color: '#ffe6cc', labelX: 945, labelY: 430 },
    { id: 'risk', label: '场地调查及风险评估阶段', x: 50, y: 980, width: 930, height: 510, color: '#fff2b8', labelX: 945, labelY: 1064 },
    { id: 'feasibility', label: '工程可行性研究阶段', x: 50, y: 1515, width: 930, height: 295, color: '#edf0f3', labelX: 945, labelY: 1574 }
  ],
  nodes: [
    { id: 'notice', stage: 'prepare', label: '收到中标通知书', x: 330, y: 60, width: 220, height: 46 },
    { id: 'site', stage: 'prepare', label: '入驻现场', x: 330, y: 125, width: 220, height: 46 },
    { id: 'collect', stage: 'prepare', label: '收集和整理分析前期资料', x: 330, y: 205, width: 220, height: 54 },
    { id: 'eia', stage: 'prepare', label: '企业历年环评资料', x: 645, y: 76, width: 220, height: 38, small: true },
    { id: 'around', stage: 'prepare', label: '周边工业企业环评资料', x: 645, y: 122, width: 220, height: 38, small: true },
    { id: 'history', stage: 'prepare', label: '场地历史变迁资料', x: 645, y: 168, width: 220, height: 38, small: true },
    { id: 'planning', stage: 'prepare', label: '用地规划及环境功能区划资料', x: 645, y: 214, width: 220, height: 38, small: true },

    { id: 'survey-entry', stage: 'survey', label: '进入场地调查服务阶段', x: 330, y: 360, width: 220, height: 48 },
    { id: 'hydro', stage: 'survey', label: '水文地质勘察与测绘', x: 330, y: 435, width: 220, height: 48 },
    { id: 'plan', stage: 'survey', label: '制定场地调查实施方案', x: 330, y: 510, width: 220, height: 48 },
    { id: 'field', stage: 'survey', label: '场地调查现场工作（分阶段开展）', x: 330, y: 585, width: 220, height: 56 },
    { id: 'drill', stage: 'survey', label: '现场钻探及建井作业', x: 645, y: 528, width: 220, height: 38, small: true },
    { id: 'sample', stage: 'survey', label: '现场采样、送检', x: 645, y: 574, width: 220, height: 38, small: true },
    { id: 'record', stage: 'survey', label: '现场分析及记录', x: 645, y: 620, width: 220, height: 38, small: true },
    { id: 'lab', stage: 'survey', label: '实验室检测分析', x: 645, y: 666, width: 220, height: 38, small: true },
    { id: 'analysis', stage: 'survey', label: '结果分析和场调报告编制', x: 330, y: 720, width: 220, height: 54 },
    { id: 'model', stage: 'survey', label: '构建场地水文地质概念模型', x: 115, y: 810, width: 230, height: 54 },
    { id: 'gw', stage: 'survey', label: '确定地下水污染的污染因子及影响程度', x: 405, y: 810, width: 230, height: 54 },
    { id: 'soil', stage: 'survey', label: '确定土壤污染的污染因子及影响程度', x: 695, y: 810, width: 190, height: 54 },
    { id: 'detail-report', stage: 'survey', label: '场地详细调查报告', x: 285, y: 900, width: 210, height: 44 },
    { id: 'survey-review', stage: 'survey', label: '通过专家及主管部门审查', x: 585, y: 900, width: 230, height: 44 },

    { id: 'risk-entry', stage: 'risk', label: '进入风险评估阶段', x: 330, y: 1012, width: 220, height: 48 },
    { id: 'land', stage: 'risk', label: '土地利用方式', x: 145, y: 1080, width: 200, height: 38, small: true },
    { id: 'survey-data', stage: 'risk', label: '分析场调资料', x: 145, y: 1128, width: 200, height: 38, small: true },
    { id: 'property', stage: 'risk', label: '污染物理化特性', x: 145, y: 1176, width: 200, height: 38, small: true },
    { id: 'concern', stage: 'risk', label: '关注污染物', x: 145, y: 1224, width: 200, height: 38, small: true },
    { id: 'receptor', stage: 'risk', label: '环境受体分析', x: 585, y: 1080, width: 200, height: 38, small: true },
    { id: 'water', stage: 'risk', label: '周边水体', x: 585, y: 1128, width: 200, height: 38, small: true },
    { id: 'health', stage: 'risk', label: '人体健康', x: 585, y: 1176, width: 200, height: 38, small: true },
    { id: 'groundwater', stage: 'risk', label: '地下水', x: 585, y: 1224, width: 200, height: 38, small: true },
    { id: 'exposure', stage: 'risk', label: '暴露评估、毒性评估', x: 330, y: 1286, width: 220, height: 44 },
    { id: 'risk-analysis', stage: 'risk', label: '风险表征分析', x: 330, y: 1344, width: 220, height: 44 },
    { id: 'control', stage: 'risk', label: '风险控制值计算', x: 330, y: 1402, width: 220, height: 44 },
    { id: 'risk-report', stage: 'risk', label: '风险评估报告', x: 255, y: 1450, width: 200, height: 42 },
    { id: 'risk-review', stage: 'risk', label: '通过专家及主管部门审查', x: 585, y: 1450, width: 230, height: 42 },

    { id: 'feas-entry', stage: 'feasibility', label: '进入工程可行性研究报告编制阶段', x: 310, y: 1542, width: 280, height: 50 },
    { id: 'process-select', stage: 'feasibility', label: '修复工艺筛选', x: 95, y: 1622, width: 170, height: 38, small: true },
    { id: 'route', stage: 'feasibility', label: '总体技术路线确定', x: 315, y: 1622, width: 170, height: 38, small: true },
    { id: 'target', stage: 'feasibility', label: '修复目标值确定', x: 535, y: 1622, width: 170, height: 38, small: true },
    { id: 'quantity', stage: 'feasibility', label: '修复与风险管控工程量确定', x: 755, y: 1622, width: 170, height: 38, small: true },
    { id: 'investment', stage: 'feasibility', label: '投资估算与效益分析', x: 190, y: 1692, width: 190, height: 38, small: true },
    { id: 'management', stage: 'feasibility', label: '环境保护管理', x: 425, y: 1692, width: 170, height: 38, small: true },
    { id: 'organization', stage: 'feasibility', label: '项目组织与实施', x: 650, y: 1692, width: 170, height: 38, small: true },
    { id: 'feas-report', stage: 'feasibility', label: '工程可行性研究报告', x: 285, y: 1760, width: 220, height: 42 },
    { id: 'approval', stage: 'feasibility', label: '项目发改立项', x: 600, y: 1760, width: 180, height: 42 }
  ],
  arrows: [
    ['notice', 'site'], ['site', 'collect'], ['collect', 'survey-entry'],
    ['survey-entry', 'hydro'], ['hydro', 'plan'], ['plan', 'field'], ['field', 'analysis'],
    ['detail-report', 'survey-review'], ['survey-review', 'risk-entry'],
    ['land', 'survey-data'], ['survey-data', 'property'], ['property', 'concern'],
    ['receptor', 'water'], ['water', 'health'], ['health', 'groundwater'],
    ['exposure', 'risk-analysis'], ['risk-analysis', 'control'], ['control', 'risk-report'], ['risk-report', 'risk-review'], ['risk-review', 'feas-entry'],
    ['feas-report', 'approval']
  ],
  routedArrows: [
    { from: 'collect', to: 'eia', points: [[550, 232], [605, 232], [605, 95], [645, 95]] },
    { from: 'collect', to: 'around', points: [[550, 232], [605, 232], [605, 141], [645, 141]] },
    { from: 'collect', to: 'history', points: [[550, 232], [605, 232], [605, 187], [645, 187]] },
    { from: 'collect', to: 'planning', points: [[550, 232], [605, 232], [605, 233], [645, 233]] },

    { from: 'field', to: 'drill', points: [[550, 613], [605, 613], [605, 547], [645, 547]] },
    { from: 'field', to: 'sample', points: [[550, 613], [605, 613], [605, 593], [645, 593]] },
    { from: 'field', to: 'record', points: [[550, 613], [605, 613], [605, 639], [645, 639]] },
    { from: 'field', to: 'lab', points: [[550, 613], [605, 613], [605, 685], [645, 685]] },
    { from: 'analysis', to: 'model', points: [[440, 774], [440, 790], [230, 790], [230, 810]] },
    { from: 'analysis', to: 'gw', points: [[440, 774], [440, 790], [520, 790], [520, 810]] },
    { from: 'analysis', to: 'soil', points: [[440, 774], [440, 790], [790, 790], [790, 810]] },
    { from: 'model', to: 'detail-report', points: [[230, 864], [230, 882], [390, 882], [390, 900]] },
    { from: 'gw', to: 'detail-report', points: [[520, 864], [520, 882], [390, 882], [390, 900]] },
    { from: 'soil', to: 'detail-report', points: [[790, 864], [790, 882], [390, 882], [390, 900]] },

    { from: 'risk-entry', to: 'land', points: [[440, 1060], [440, 1070], [245, 1070], [245, 1080]] },
    { from: 'risk-entry', to: 'receptor', points: [[440, 1060], [440, 1070], [685, 1070], [685, 1080]] },
    { from: 'concern', to: 'exposure', points: [[245, 1262], [245, 1276], [440, 1276], [440, 1286]] },
    { from: 'groundwater', to: 'exposure', points: [[685, 1262], [685, 1276], [440, 1276], [440, 1286]] },

    { from: 'feas-entry', to: 'process-select', points: [[450, 1592], [450, 1608], [180, 1608], [180, 1622]] },
    { from: 'feas-entry', to: 'route', points: [[450, 1592], [450, 1622]] },
    { from: 'feas-entry', to: 'target', points: [[450, 1592], [450, 1608], [620, 1608], [620, 1622]] },
    { from: 'feas-entry', to: 'quantity', points: [[450, 1592], [450, 1608], [840, 1608], [840, 1622]] },
    { from: 'process-select', to: 'investment', points: [[180, 1660], [180, 1676], [285, 1676], [285, 1692]] },
    { from: 'route', to: 'management', points: [[400, 1660], [400, 1676], [510, 1676], [510, 1692]] },
    { from: 'target', to: 'management', points: [[620, 1660], [620, 1676], [510, 1676], [510, 1692]] },
    { from: 'quantity', to: 'organization', points: [[840, 1660], [840, 1676], [735, 1676], [735, 1692]] },
    { from: 'investment', to: 'feas-report', points: [[285, 1730], [285, 1746], [395, 1746], [395, 1760]] },
    { from: 'management', to: 'feas-report', points: [[510, 1730], [510, 1746], [395, 1746], [395, 1760]] },
    { from: 'organization', to: 'feas-report', points: [[735, 1730], [735, 1746], [395, 1746], [395, 1760]] }
  ],
  captionY: 1842
}
