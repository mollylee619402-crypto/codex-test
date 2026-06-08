const DECISION_WORDS = ['如果', '是否', '判断', '通过', '不通过', '成功', '失败', '感兴趣', '强需求', '付费意向']
const SUCCESS_WORDS = ['通过', '成功', '完成', '关注', '预约', '付费', '复购', '转介绍', '领取']
const RISK_WORDS = ['不通过', '失败', '离开', '异常', '风险', '没有', '不感兴趣', '暂无', '无']

const splitText = (text) =>
  text
    .replace(/\n+/g, '。')
    .split(/[。；;，,、]/)
    .map((item) => item.trim())
    .filter(Boolean)

const cleanLabel = (sentence) => {
  let label = sentence
    .replace(/^(用户|访客|客户|管理员|系统|平台|运营|产品经理)/, '')
    .replace(/^(如果|则|后|然后|接着|并|且|可能|暂时)/, '')
    .replace(/^(对|有)/, '')
    .trim()

  if (!label) label = sentence.trim()
  return label.length > 12 ? `${label.slice(0, 11)}…` : label
}

const detectType = (sentence, index, total) => {
  if (index === 0) return 'start'
  if (index === total - 1) return 'output'
  if (DECISION_WORDS.some((word) => sentence.includes(word))) return 'decision'
  if (RISK_WORDS.some((word) => sentence.includes(word))) return 'risk'
  if (SUCCESS_WORDS.some((word) => sentence.includes(word))) return 'success'
  return 'process'
}

export const parseFlowDescription = (text) => {
  const sentences = splitText(text)
  const source = sentences.length ? sentences : ['开始整理流程', '确认执行步骤', '输出流程图']

  return source.map((sentence, index) => ({
    id: `N${index + 1}`,
    raw: sentence,
    label: cleanLabel(sentence),
    type: detectType(sentence, index, source.length)
  }))
}

export const buildFlowSummary = (nodes, config) => {
  const decisionCount = nodes.filter((node) => node.type === 'decision').length
  const riskCount = nodes.filter((node) => node.type === 'risk').length
  return [
    `已根据输入内容拆解出 ${nodes.length} 个流程节点。`,
    decisionCount ? `识别到 ${decisionCount} 个判断节点，并为通过/不通过路径预留分支。` : '当前流程以线性步骤为主，适合沉淀为基础 SOP。',
    riskCount ? `发现 ${riskCount} 个异常或流失节点，已在美化版中降低视觉权重。` : '未发现明显异常路径，关键路径会被重点突出。',
    `当前模板：${config.diagramTypeLabel}；输出用途：${config.outputPurpose}；视觉风格：${config.style}。`
  ]
}
