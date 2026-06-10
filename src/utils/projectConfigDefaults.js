import { TECHNICAL_SERVICE_REPORT_LAYOUT, SITE_SURVEY_REPORT_LAYOUT, ORGANIZATION_REPORT_LAYOUT } from './reportDiagramTemplates.js'

export const DEFAULT_PROJECT_CONFIG = {
  projectName: '某化工企业污染场地调查与风险评估项目',
  figureNumber: '图3-2',
  figureTitle: '资料收集分析与踏勘工作流程图',
  reportUse: '环保工程技术报告',
  projectType: '污染场地调查与风险评估',
  serviceTarget: '建设单位或服务对象',
  organizationName: '编制单位',
  exportBaseName: ''
}

export function captionFromProjectConfig(projectConfig = {}, fallback = '') {
  const figureNumber = String(projectConfig.figureNumber || '').trim()
  const figureTitle = String(projectConfig.figureTitle || '').trim()
  if (figureNumber && figureTitle) return `${figureNumber} ${figureTitle}`
  return figureTitle || figureNumber || fallback
}

export function mergeProjectConfig(base = {}, patch = {}) {
  return { ...DEFAULT_PROJECT_CONFIG, ...base, ...patch }
}

export function createDefaultStructuredText(templateType = 'technical-service') {
  if (templateType === 'site-survey') {
    const labels = [
      ...SITE_SURVEY_REPORT_LAYOUT.nodes.slice(0, 4).map((node) => node.label),
      SITE_SURVEY_REPORT_LAYOUT.group.label,
      ...SITE_SURVEY_REPORT_LAYOUT.group.children.map((node) => node.label),
      ...SITE_SURVEY_REPORT_LAYOUT.nodes.slice(4).map((node) => node.label)
    ]
    return ['阶段一：资料收集与踏勘工作', ...labels.map((label) => `* ${label}`)].join('\n')
  }

  if (templateType === 'project-org' || templateType === 'organization') {
    const supportDepartments = ORGANIZATION_REPORT_LAYOUT.nodes.filter((node) => node.id.startsWith('support-')).map((node) => node.label)
    const fieldTasks = ORGANIZATION_REPORT_LAYOUT.nodes.filter((node) => node.id.startsWith('field-task-')).map((node) => node.label)
    const designTasks = ORGANIZATION_REPORT_LAYOUT.nodes.filter((node) => node.id.startsWith('design-task-')).map((node) => node.label)
    return [
      '阶段一：项目组织架构',
      '* 公司名称：永清环保股份有限公司',
      `* 公司支撑部门：${supportDepartments.join('、')}`,
      '* 项目组名称：污染场地调查与风险评估项目组',
      '* 项目总负责人：项目总负责人',
      '* 工作组：场调和风评工作组',
      '  * 场调风评负责人',
      ...fieldTasks.map((label) => `  * ${label}`),
      '* 工作组：可研设计组',
      '  * 可研设计负责人',
      ...designTasks.map((label) => `  * ${label}`)
    ].join('\n')
  }

  return TECHNICAL_SERVICE_REPORT_LAYOUT.stages.map((stage) => {
    const nodes = TECHNICAL_SERVICE_REPORT_LAYOUT.nodes.filter((node) => node.stage === stage.id).map((node) => `* ${node.label}`)
    return [`阶段：${stage.label}`, ...nodes].join('\n')
  }).join('\n\n')
}

export const PROJECT_PRESETS = [
  {
    id: 'chemical-risk',
    name: '化工企业污染场地调查与风险评估项目',
    diagramType: 'technical-service',
    outputPurpose: '风险评估报告',
    style: '技术报告',
    content: '面向化工企业污染场地调查与风险评估项目，按进场准备、场地调查、风险评估和工程可研组织技术服务。',
    projectConfig: {
      projectName: '某化工企业污染场地调查与风险评估项目',
      figureNumber: '图4-1',
      figureTitle: '本项目技术服务工作流程',
      reportUse: '风险评估报告',
      projectType: '污染场地调查与风险评估',
      serviceTarget: '某化工企业',
      organizationName: '某环保科技有限公司',
      exportBaseName: ''
    },
    structuredInput: [
      '阶段一：进场准备阶段',
      '* 收到中标通知书',
      '* 入驻现场',
      '* 收集和整理前期资料',
      '* 企业历年环评资料',
      '* 周边工业企业环评资料',
      '* 场地历史变迁资料',
      '* 用地规划及环境功能区划资料',
      '',
      '阶段二：场地调查服务阶段',
      '* 水文地质勘察与测绘',
      '* 制定场地调查实施方案',
      '* 场地调查现场工作',
      '  * 现场钻探及建井作业',
      '  * 现场采样、送检',
      '  * 现场分析及记录',
      '  * 实验室检测分析',
      '* 结果分析和报告编制',
      '* 构建场地水文地质概念模型',
      '* 确定地下水污染因子及影响程度',
      '* 确定土壤污染因子及影响程度',
      '* 场地详细调查报告',
      '* 通过专家及主管部门审查',
      '',
      '阶段三：风险评估阶段',
      '* 土地利用方式',
      '* 分析场调资料',
      '* 污染物理化特性',
      '* 关注污染物',
      '* 环境受体分析',
      '* 周边水体',
      '* 人体健康',
      '* 地下水',
      '* 暴露评估、毒性评估',
      '* 风险表征分析',
      '* 风险控制值计算',
      '* 风险评估报告',
      '* 通过专家及主管部门审查',
      '',
      '阶段四：工程可行性研究阶段',
      '* 修复工艺筛选',
      '* 总体技术路线确定',
      '* 修复目标值确定',
      '* 修复与风险管控工程量确定',
      '* 投资估算与效益分析',
      '* 环境保护管理',
      '* 项目组织与实施',
      '* 工程可行性研究报告',
      '* 项目发改立项'
    ].join('\n')
  },
  {
    id: 'wastewater-upgrade',
    name: '工业园区废水处理站提标改造项目',
    diagramType: 'technical-service',
    outputPurpose: '工程可行性研究报告',
    style: '技术报告',
    content: '面向工业园区废水处理站提标改造项目，组织现状调查、工艺比选、可研设计和成果审查。',
    projectConfig: {
      projectName: '某工业园区废水处理站提标改造项目',
      figureNumber: '图2-1',
      figureTitle: '提标改造技术服务工作流程',
      reportUse: '工程可研报告',
      projectType: '废水处理站提标改造',
      serviceTarget: '某工业园区管理委员会',
      organizationName: '某市政环保设计院',
      exportBaseName: ''
    },
    structuredInput: [
      '阶段一：现状调研阶段',
      '* 收到委托任务书',
      '* 踏勘废水处理站现场',
      '* 收集运行台账和水质资料',
      '* 排污许可和验收资料',
      '* 园区企业排水资料',
      '* 现状构筑物和设备资料',
      '* 地方排放标准资料',
      '',
      '阶段二：方案论证阶段',
      '* 进出水水质复核',
      '* 提标目标和边界条件确定',
      '* 改造方案比选',
      '  * 生化系统能力核算',
      '  * 深度处理单元比选',
      '  * 污泥处置路径复核',
      '  * 自动化控制需求分析',
      '* 推荐技术路线形成',
      '* 水量水质平衡分析',
      '* 总平面布置复核',
      '* 主要设备清单',
      '* 提标改造方案报告',
      '* 专家咨询意见落实',
      '',
      '阶段三：可研深化阶段',
      '* 建设必要性分析',
      '* 设计基础资料分析',
      '* 处理工艺参数确定',
      '* 关键控制污染物',
      '* 环境影响和风险分析',
      '* 达标稳定性评估',
      '* 运行维护要求',
      '* 工程投资估算',
      '* 财务与效益分析',
      '* 节能与安全分析',
      '* 可行性研究报告',
      '* 通过主管部门审查',
      '',
      '阶段四：实施准备阶段',
      '* 初步设计衔接',
      '* 招标技术文件编制',
      '* 施工组织边界确定',
      '* 停水切换方案确定',
      '* 投资控制与进度计划',
      '* 环境保护管理',
      '* 项目组织与实施',
      '* 工程可行性研究报告',
      '* 项目立项批复'
    ].join('\n')
  },
  {
    id: 'acceptance',
    name: '企业竣工环保验收项目',
    diagramType: 'site-survey',
    outputPurpose: '竣工环保验收报告',
    style: '技术报告',
    content: '面向企业竣工环保验收项目，完成资料核查、现场踏勘、人员访谈、问题梳理和验收监测计划。',
    projectConfig: {
      projectName: '某企业建设项目竣工环保验收项目',
      figureNumber: '图3-1',
      figureTitle: '竣工环保验收资料核查与现场踏勘流程',
      reportUse: '竣工环保验收报告',
      projectType: '竣工环保验收',
      serviceTarget: '某生产企业',
      organizationName: '某环境咨询有限公司',
      exportBaseName: ''
    },
    structuredInput: [
      '阶段一：验收准备与现场核查',
      '* 确定验收对象',
      '* 工作准备',
      '* 基本信息核实',
      '* 资料收集',
      '* 现场核查',
      '* 现场踏勘',
      '* 人员访谈',
      '* 信息整理与问题分析',
      '* 验收监测与整改计划'
    ].join('\n')
  }
]
