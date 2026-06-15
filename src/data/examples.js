import { ENVIRONMENT_EXAMPLES } from './environmentExamples.js'

export const DEFAULT_EXAMPLE = ENVIRONMENT_EXAMPLES[0]

export const DIAGRAM_TYPES = [
  { label: '基础版流程图', value: 'basic' },
  { label: '美化版流程图', value: 'beautified' },
  { label: '产品流程图', value: 'product' },
  { label: 'SOP 流程图', value: 'sop' },
  { label: '系统流程图', value: 'system' },
  { label: '资料收集与踏勘流程图', value: 'site-survey' },
  { label: '技术服务总体流程图', value: 'technical-service' },
  { label: '项目组织架构图', value: 'project-org' },
  { label: '项目整治技术路线图', value: 'remediation-route' },
  { label: '环保工艺流程图', value: 'environment-process' },
  { label: '环保监测流程图', value: 'monitoring' },
  { label: '环评/验收流程图', value: 'eia' },
  { label: '风险评估流程图', value: 'risk-assessment' },
  { label: '应急处置流程图', value: 'emergency' },
  { label: '运维管理流程图', value: 'operation' }
]

export const OUTPUT_PURPOSES = [
  'PRD 文档',
  '汇报 PPT',
  '会议纪要',
  '小红书配图',
  '团队 SOP',
  '环保工程技术报告',
  '场地调查报告',
  '风险评估报告',
  '工程可行性研究报告',
  '竣工环保验收报告',
  '运维方案',
  '应急预案',
  '项目管理组织架构图'
]

export const STYLE_OPTIONS = ['简洁', '商务', '活泼', '科技感', '技术报告', '低饱和环保蓝绿']

export { ENVIRONMENT_EXAMPLES }
