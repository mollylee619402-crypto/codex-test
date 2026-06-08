export const DEFAULT_EXAMPLE = {
  name: '小红书 AI 求职账号转化流程',
  content:
    '用户看到小红书笔记，点击进入主页，查看置顶笔记。如果对内容感兴趣，则关注账号；如果不感兴趣，则离开页面。关注后，用户可能私信咨询，领取简历模板。领取资料后，如果用户有强需求，则预约付费咨询；如果暂时没有付费意向，则进入社群培育。完成咨询后，沉淀案例并引导复购或转介绍。',
  diagramType: 'beautified',
  outputPurpose: '汇报 PPT',
  style: '商务'
}

export const DIAGRAM_TYPES = [
  { label: '基础版流程图', value: 'basic' },
  { label: '美化版流程图', value: 'beautified' },
  { label: '产品流程图', value: 'product' },
  { label: 'SOP 流程图', value: 'sop' },
  { label: '系统流程图', value: 'system' }
]

export const OUTPUT_PURPOSES = ['PRD 文档', '汇报 PPT', '会议纪要', '小红书配图', '团队 SOP']

export const STYLE_OPTIONS = ['简洁', '商务', '活泼', '科技感']
