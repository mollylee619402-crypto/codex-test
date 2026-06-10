export const REPORT_SVG_NOTICE = '该模板使用报告版 SVG 渲染，适合导出到 Word/PPT/Visio 后微调。'

export const reportTemplateRegistry = {
  'site-survey': {
    key: 'site-survey',
    aliases: ['资料收集与踏勘流程图', '资料收集分析与踏勘工作流程图'],
    name: '资料收集与踏勘流程图',
    caption: '图3-2 资料收集分析与踏勘工作流程图',
    canvas: { width: 620, height: 680 },
    recommendedUse: 'Word 技术报告',
    exportBaseName: '资料收集与踏勘流程图',
    description: '用于展示调查准备、资料收集、现场踏勘、人员访谈和分析筛查流程。',
    pptxMode: 'native'
  },
  'technical-service': {
    key: 'technical-service',
    aliases: ['技术服务总体流程图', '本项目技术服务工作流程'],
    name: '技术服务总体流程图',
    caption: '图4-1 本项目技术服务工作流程',
    canvas: { width: 1040, height: 1870 },
    recommendedUse: 'Word 技术报告',
    exportBaseName: '技术服务总体流程图',
    description: '用于展示进场准备、场地调查、风险评估和工程可行性研究等阶段工作流程。',
    pptxMode: 'native'
  },
  organization: {
    key: 'organization',
    aliases: ['project-org', '项目组织架构图', '项目管理机构组织架构图'],
    name: '项目组织架构图',
    caption: '图1-1 项目管理机构组织架构图',
    canvas: { width: 1300, height: 980 },
    recommendedUse: 'Word 技术报告',
    exportBaseName: '项目组织架构图',
    description: '用于展示项目管理机构、工作组和实施小组的组织关系。',
    pptxMode: 'native'
  }
}

const reportTemplateAliasMap = Object.fromEntries(
  Object.values(reportTemplateRegistry).flatMap((config) => [config.key, ...(config.aliases || [])].map((alias) => [alias, config.key]))
)

export const REPORT_SVG_TEMPLATE_TYPES = Object.keys(reportTemplateAliasMap)

export function normalizeReportTemplateType(templateType) {
  return reportTemplateAliasMap[templateType] || ''
}

export function isReportTemplate(templateType) {
  return Boolean(normalizeReportTemplateType(templateType))
}

export const isReportSvgTemplate = isReportTemplate

export function getReportTemplateConfig(templateType) {
  const key = normalizeReportTemplateType(templateType)
  return key ? reportTemplateRegistry[key] : null
}

export function getReportTemplateExportBaseName(templateType, fallback = 'FlowCraft流程图') {
  return getReportTemplateConfig(templateType)?.exportBaseName || fallback
}

export const EXPORT_SIZE_PRESETS = {
  'word-column': { label: 'Word 单栏宽度', targetWidth: 720, pptxLayout: { name: 'FLOWCRAFT_WORD_COLUMN', width: 6.2, height: 9.3 } },
  'word-page': { label: 'Word 页面宽度', targetWidth: 1400, pptxLayout: { name: 'FLOWCRAFT_WORD_PAGE', width: 8.27, height: 11.69 } },
  'a4-portrait': { label: 'A4 竖版', targetWidth: 1600, pptxLayout: { name: 'FLOWCRAFT_A4_PORTRAIT', width: 8.27, height: 11.69 } },
  'a4-landscape': { label: 'A4 横版', targetWidth: 2200, pptxLayout: { name: 'FLOWCRAFT_A4_LANDSCAPE', width: 11.69, height: 8.27 } },
  'ppt-16-9': { label: 'PPT 16:9', targetWidth: 1920, pptxLayout: { name: 'FLOWCRAFT_PPT_16_9', width: 13.333, height: 7.5 } },
  original: { label: '原始尺寸', targetWidth: null, pptxLayout: null }
}

export function getExportSizePreset(value) {
  return EXPORT_SIZE_PRESETS[value] || EXPORT_SIZE_PRESETS['word-page']
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


const organizationSupportNodes = ['质安部', '计划经营部', '财务部', '修复技术中心', '信息管理部', '设计研究院', '采购部', '综合管理部']
const fieldRiskTaskNodes = [
  '现场班组', '现场采样小组', '质量控制小组', '快速分析小组',
  '定位测绘小组', '样品收集运输组', '数据分析组', '风险评价组',
  '图件制作组', '报告整合组', '地质钻探组', '工程测绘组',
  '原位测试组', '专题报告及图件组', '室内试验组', '质检组'
]
const feasibilityTaskNodes = ['修复工艺设计组', '废水处理工艺组', '技经组', '药剂研发组']

export const ORGANIZATION_REPORT_LAYOUT = {
  width: 1300,
  height: 980,
  caption: '图1-1 项目管理机构组织架构图',
  colors: {
    project: '#fff2cc',
    company: '#fce4d6',
    support: '#e2f0d9',
    projectGroup: '#eaf4ea',
    leader: '#d9eaf7',
    team: '#dff0df',
    taskBlue: '#ddebf7',
    taskYellow: '#fff2cc',
    taskGreen: '#e2f0d9',
    taskOrange: '#fce4d6'
  },
  nodes: [
    {
      id: 'project',
      label: '富拉尔基区黑龙江黑化集团污染场地调查与评估及污染治理工程可行性研究报告技术服务项目',
      x: 110,
      y: 28,
      width: 1080,
      height: 60,
      fill: '#fff2cc',
      fontSize: 18,
      bold: true,
      maxChars: 34
    },
    { id: 'company', label: '永清环保股份有限公司', x: 490, y: 112, width: 320, height: 46, fill: '#fce4d6', fontSize: 17, bold: true },
    ...organizationSupportNodes.map((label, index) => ({
      id: `support-${index + 1}`,
      label,
      x: 60 + index * 150,
      y: 188,
      width: 125,
      height: 42,
      fill: '#e2f0d9',
      fontSize: 14,
      maxChars: 7
    })),
    {
      id: 'project-group',
      label: '富拉尔基区黑龙江黑化集团污染场地调查与评估及污染治理工程可行性研究报告技术服务项目组',
      x: 200,
      y: 292,
      width: 900,
      height: 52,
      fill: '#eaf4ea',
      fontSize: 16,
      bold: true,
      maxChars: 32
    },
    { id: 'chief', label: '项目总负责人', x: 540, y: 370, width: 220, height: 44, fill: '#d9eaf7', fontSize: 16, bold: true },
    { id: 'field-team', label: '场调和风评工作组', x: 250, y: 468, width: 245, height: 44, fill: '#dff0df', fontSize: 15, bold: true },
    { id: 'design-team', label: '可研设计组', x: 805, y: 468, width: 245, height: 44, fill: '#dff0df', fontSize: 15, bold: true },
    { id: 'field-leader', label: '场调风评负责人', x: 250, y: 538, width: 245, height: 42, fill: '#d9eaf7', fontSize: 15, bold: true },
    { id: 'design-leader', label: '可研设计负责人', x: 805, y: 538, width: 245, height: 42, fill: '#d9eaf7', fontSize: 15, bold: true },
    ...fieldRiskTaskNodes.map((label, index) => {
      const col = index % 4
      const row = Math.floor(index / 4)
      const fills = ['#ddebf7', '#fff2cc', '#e2f0d9', '#fce4d6']
      return {
        id: `field-task-${index + 1}`,
        label,
        x: 70 + col * 155,
        y: 650 + row * 64,
        width: 130,
        height: 42,
        fill: fills[index % fills.length],
        fontSize: 13,
        maxChars: 7
      }
    }),
    ...feasibilityTaskNodes.map((label, index) => {
      const fills = ['#ddebf7', '#fff2cc', '#e2f0d9', '#fce4d6']
      return {
        id: `design-task-${index + 1}`,
        label,
        x: 710 + index * 140,
        y: 682,
        width: 120,
        height: 54,
        fill: fills[index % fills.length],
        fontSize: 13,
        maxChars: 8
      }
    })
  ],
  separators: [
    { y: 260, label: '公司级支撑层', labelX: 1165, labelY: 214 },
    { y: 438, label: '项目管理层', labelX: 1165, labelY: 505 },
    { y: 622, label: '项目实施层', labelX: 1165, labelY: 755 }
  ],
  captionY: 940
}

ORGANIZATION_REPORT_LAYOUT.connectors = [
  { type: 'branch', from: 'company', to: ORGANIZATION_REPORT_LAYOUT.nodes.filter((node) => node.id.startsWith('support-')).map((node) => node.id), busY: 176 },
  { type: 'arrow', from: 'company', to: 'project-group', via: [[650, 258]] },
  { type: 'arrow', from: 'project-group', to: 'chief' },
  { type: 'branch', from: 'chief', to: ['field-team', 'design-team'], busY: 442 },
  { type: 'arrow', from: 'field-team', to: 'field-leader' },
  { type: 'arrow', from: 'design-team', to: 'design-leader' },
  { type: 'branch', from: 'field-leader', to: fieldRiskTaskNodes.map((_, index) => `field-task-${index + 1}`), busY: 618 },
  { type: 'branch', from: 'design-leader', to: feasibilityTaskNodes.map((_, index) => `design-task-${index + 1}`), busY: 650 }
]

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
