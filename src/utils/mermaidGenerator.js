const sanitize = (label) => label.replace(/["#;]/g, '').replace(/\s+/g, ' ').trim() || '步骤'
const quoteLabel = (label) => `"${sanitize(label)}"`

const nodeSyntax = (node) => {
  const label = quoteLabel(node.label)
  if (node.type === 'decision') return `${node.id}{${label}}`
  if (node.type === 'start') return `${node.id}([${label}])`
  if (node.type === 'output') return `${node.id}([${label}])`
  return `${node.id}[${label}]`
}

const classNameFor = (type) => {
  if (type === 'start') return 'start'
  if (type === 'decision') return 'decision'
  if (type === 'risk') return 'risk'
  if (type === 'success') return 'success'
  if (type === 'output') return 'output'
  return 'process'
}

const decisionLine = (node, nextNode, fallbackNode) => {
  const yesTarget = nextNode?.id || node.id
  const noTarget = fallbackNode?.id || nextNode?.id || node.id
  return [`  ${node.id} -- 是/通过 --> ${yesTarget}`, `  ${node.id} -- 否/不通过 --> ${noTarget}`]
}

export const generateBasicMermaid = (nodes) => {
  const lines = ['flowchart TD']
  nodes.forEach((node) => lines.push(`  ${nodeSyntax(node)}`))

  nodes.forEach((node, index) => {
    const nextNode = nodes[index + 1]
    if (!nextNode) return
    if (node.type === 'decision') {
      lines.push(...decisionLine(node, nextNode, nodes[index + 2]))
      return
    }
    lines.push(`  ${node.id} --> ${nextNode.id}`)
  })

  return lines.join('\n')
}

const groupNodes = (nodes) => {
  const size = Math.max(2, Math.ceil(nodes.length / 3))
  return [
    { title: '阶段一：触达与识别', nodes: nodes.slice(0, size) },
    { title: '阶段二：推进与判断', nodes: nodes.slice(size, size * 2) },
    { title: '阶段三：产出与沉淀', nodes: nodes.slice(size * 2) }
  ].filter((group) => group.nodes.length)
}

export const generateBeautifiedMermaid = (nodes, config = {}) => {
  const lines = [
    'flowchart TD',
    `  %% FlowCraft generated for ${config.outputPurpose || 'PRD 文档'} / ${config.style || '简洁'}`,
    '  classDef start fill:#e0f2fe,stroke:#0284c7,color:#0f172a,stroke-width:2px;',
    '  classDef process fill:#f8fafc,stroke:#94a3b8,color:#334155,stroke-width:1.5px;',
    '  classDef decision fill:#fef3c7,stroke:#f59e0b,color:#78350f,stroke-width:2px;',
    '  classDef success fill:#dcfce7,stroke:#22c55e,color:#14532d,stroke-width:2px;',
    '  classDef risk fill:#fee2e2,stroke:#f87171,color:#7f1d1d,stroke-dasharray:5 4;',
    '  classDef output fill:#ede9fe,stroke:#8b5cf6,color:#312e81,stroke-width:2px;'
  ]

  groupNodes(nodes).forEach((group, groupIndex) => {
    lines.push(`  subgraph G${groupIndex + 1}["${group.title}"]`)
    group.nodes.forEach((node) => lines.push(`    ${nodeSyntax(node)}`))
    lines.push('  end')
  })

  nodes.forEach((node, index) => {
    const nextNode = nodes[index + 1]
    if (!nextNode) return
    if (node.type === 'decision') {
      lines.push(...decisionLine(node, nextNode, nodes[index + 2]))
      return
    }
    lines.push(`  ${node.id} --> ${nextNode.id}`)
  })

  nodes.forEach((node) => lines.push(`  class ${node.id} ${classNameFor(node.type)};`))
  return lines.join('\n')
}

export const generateMermaid = (nodes, config) => {
  if (config.diagramType === 'basic') return generateBasicMermaid(nodes)
  return generateBeautifiedMermaid(nodes, config)
}
