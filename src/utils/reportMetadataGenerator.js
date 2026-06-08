const META_BY_TYPE = {
  'site-survey': {
    title: '资料收集分析与踏勘工作流程图',
    caption: '图3-2 资料收集分析与踏勘工作流程图',
    description: '用于技术报告中展示调查对象确认、资料收集、现场勘查、信息分析以及风险筛查与下步计划的单主线工作流程。',
    controls: ['调查对象与基础信息核实', '资料完整性与现场勘查闭环', '风险筛查与下步计划']
  },
  'technical-service': {
    title: '本项目技术服务工作流程',
    caption: '图4-1 本项目技术服务工作流程',
    description: '按进场准备、场地调查、风险评估、工程可行性研究等阶段组织技术服务工作，突出阶段成果与报告产出。',
    controls: ['进场资料交接', '调查方案与检测结果分析', '风险评估结论', '可研技术路线与投资估算']
  },
  'project-org': {
    title: '项目管理机构组织架构图',
    caption: '图1-1 项目管理机构组织架构图',
    description: '展示公司级支撑、项目管理层、项目实施层的组织关系，明确项目负责人、工作组和执行小组职责边界。',
    controls: ['公司级资源支撑', '项目总负责人统一协调', '场调风评与可研设计双线推进']
  },
  'environment-process': {
    title: '环保工艺流程图',
    caption: '图2-1 环保工艺流程图',
    description: '展示污染源、收集系统、处理单元、监测点位、排放回用及副产物处置之间的工程关系。',
    controls: ['污染源识别', '处理单元稳定运行', '排放与回用达标控制']
  },
  monitoring: {
    title: '环保监测流程图',
    caption: '图2-2 环保监测流程图',
    description: '展示监测方案、点位布设、样品采集、实验室检测、数据审核与监测报告形成过程。',
    controls: ['点位代表性', '采样质控', '数据审核']
  },
  eia: {
    title: '环评/验收流程图',
    caption: '图5-1 环评/验收流程图',
    description: '展示环评或竣工环保验收中的资料准备、现场核查、监测、问题整改、报告编制与归档流程。',
    controls: ['合规资料核查', '现场核查与整改闭环', '验收报告归档']
  },
  'risk-assessment': {
    title: '风险评估流程图',
    caption: '图6-1 风险评估流程图',
    description: '展示暴露情景、关注污染物、受体分析、健康风险计算、修复目标值推导与风险评估报告形成过程。',
    controls: ['暴露参数合理性', '风险计算复核', '修复目标值推导']
  },
  emergency: {
    title: '应急处置流程图',
    caption: '图7-1 应急处置流程图',
    description: '展示事件发现、预警研判、现场隔离、应急处置、监测评估、信息报告与恢复总结流程。',
    controls: ['事件分级响应', '现场安全控制', '信息报告与复盘']
  },
  operation: {
    title: '运维管理流程图',
    caption: '图8-1 运维管理流程图',
    description: '展示巡检、运行记录、设备维护、监测评估、异常处置、台账归档与持续改进流程。',
    controls: ['巡检与台账', '异常闭环处置', '运行绩效评估']
  }
}

const DEFAULT_META = {
  title: 'FlowCraft 流程图',
  caption: '图1-1 FlowCraft 流程图',
  description: '根据输入内容自动拆解流程节点，生成可复制、可预览、可导出的 Mermaid 流程图。',
  controls: ['关键流程节点', '判断或异常节点', '最终输出成果']
}

export function generateReportMetadata(config = {}, nodes = []) {
  const base = META_BY_TYPE[config.diagramType] || {
    ...DEFAULT_META,
    title: config.diagramTypeLabel || DEFAULT_META.title,
    caption: `图1-1 ${config.diagramTypeLabel || DEFAULT_META.title}`
  }
  const risks = nodes.filter((node) => ['risk', 'decision'].includes(node.type)).map((node) => node.label).slice(0, 5)

  return {
    ...base,
    riskNotes: risks.length ? risks : ['未识别到明显异常节点，可在 Mermaid 源码中补充风险分支。']
  }
}

export function metadataText(metadata) {
  return [
    metadata.caption,
    metadata.description,
    `关键控制节点：${metadata.controls.join('；')}`,
    `风险或异常节点：${metadata.riskNotes.join('；')}`
  ].join('\n')
}
