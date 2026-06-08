const sanitize = (label) => label.replace(/["#;]/g, '').replace(/\s+/g, ' ').trim() || '步骤'
const quoteLabel = (label) => `"${sanitize(label)}"`

const ENV_CLASS_DEFS = [
  '  classDef phase fill:#f6f9fc,stroke:#9aafc1,color:#334155,stroke-width:1.2px,stroke-dasharray:6 4;',
  '  classDef source fill:#fef3c7,stroke:#d6a644,color:#4a3b12,stroke-width:1.5px;',
  '  classDef collection fill:#e8f2f1,stroke:#6c9c9a,color:#153f3d,stroke-width:1.5px;',
  '  classDef treatment fill:#e7f4ea,stroke:#6aa574,color:#174424,stroke-width:1.8px;',
  '  classDef monitoring fill:#e8eef6,stroke:#6686a8,color:#17324d,stroke-width:1.5px;',
  '  classDef discharge fill:#e0f2fe,stroke:#4d8fb8,color:#123d5a,stroke-width:1.5px;',
  '  classDef waste fill:#f1f5f9,stroke:#7c8794,color:#334155,stroke-width:1.5px;',
  '  classDef risk fill:#fee2e2,stroke:#e07a5f,color:#7c2d12,stroke-width:1.6px,stroke-dasharray:6 4;',
  '  classDef document fill:#edf7ed,stroke:#4b9270,color:#123b27,stroke-width:2px;',
  '  classDef org fill:#e8eef6,stroke:#6686a8,color:#17324d,stroke-width:1.5px;',
  '  classDef leader fill:#ddebfa,stroke:#356ea5,color:#102a43,stroke-width:2px;',
  '  classDef team fill:#eaf4ea,stroke:#63936a,color:#173a20,stroke-width:1.6px;',
  '  classDef task fill:#f4f6f8,stroke:#a0aec0,color:#334155,stroke-width:1.2px;'
]

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

const envClassForLabel = (node) => {
  const text = `${node.raw || ''}${node.label || ''}`
  if (node.type === 'decision' || node.type === 'risk' || /风险|异常|事故|应急|超标|整改/.test(text)) return 'risk'
  if (/报告|成果|台账|方案|计划|记录|通知书|估算/.test(text) || node.type === 'output') return 'document'
  if (/污染源|废气|废水|土壤|地下水|渗滤液/.test(text)) return 'source'
  if (/收集|管网|集水|暂存|转运/.test(text)) return 'collection'
  if (/处理|修复|工艺|药剂|建井|钻探/.test(text)) return 'treatment'
  if (/监测|检测|采样|点位|测绘|勘察/.test(text)) return 'monitoring'
  if (/排放|回用|达标|外排/.test(text)) return 'discharge'
  if (/污泥|危废|副产物|废物/.test(text)) return 'waste'
  return 'task'
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

export const generateSiteSurveyMermaid = () => [
  'flowchart TD',
  ...ENV_CLASS_DEFS,
  '  T["图3-2 资料收集分析与踏勘工作流程图"]',
  '  A(["确定调查对象"])',
  '  B["完成工作准备"]',
  '  C["核实基本信息"]',
  '  D["收集项目资料"]',
  '  subgraph G1["现场勘查"]',
  '    E1["现场踏勘"]',
  '    E2["人员访谈"]',
  '  end',
  '  F["信息整理与分析"]',
  '  G["风险筛查与下步计划"]',
  '  T --> A --> B --> C --> D --> E1',
  '  D --> E2',
  '  E1 --> F',
  '  E2 --> F',
  '  F --> G',
  '  class T document;',
  '  class A leader;',
  '  class B,C,D task;',
  '  class E1,E2 monitoring;',
  '  class F document;',
  '  class G risk;',
  '  style G1 fill:#f6f9fc,stroke:#9aafc1,stroke-width:1px,stroke-dasharray:6 4;'
].join('\n')

export const generateTechnicalServiceMermaid = () => [
  'flowchart LR',
  ...ENV_CLASS_DEFS,
  '  subgraph P1["进场准备阶段"]',
  '    A1(["收到中标通知书"]) --> A2["入驻现场"] --> A3["收集和整理初期资料"] --> A4["阶段成果：进场准备完成"]',
  '  end',
  '  subgraph P2["场地调查阶段"]',
  '    B1["水文地质勘察与测绘"] --> B2["制定场地调查实施方案"]',
  '    B2 --> B3["现场钻探及建井"]',
  '    B2 --> B4["现场采样"]',
  '    B3 --> B5["实验室检测"]',
  '    B4 --> B5',
  '    B5 --> B6["结果分析"] --> B7["场地调查报告"]',
  '  end',
  '  subgraph P3["风险评估阶段"]',
  '    C1["土地利用方式分析"]',
  '    C2["关注污染物识别"]',
  '    C3["环境受体与人体健康分析"]',
  '    C4["地下水风险分析"]',
  '    C1 --> C5["风险汇总与评估"]',
  '    C2 --> C5',
  '    C3 --> C5',
  '    C4 --> C5',
  '    C5 --> C6["风险评估报告"]',
  '  end',
  '  subgraph P4["工程可行性研究阶段"]',
  '    D1["修复工艺筛选"]',
  '    D2["总体技术路线"]',
  '    D3["修复目标值"]',
  '    D4["环境保护管理"]',
  '    D5["投资估算与效益分析"]',
  '    D1 --> D6["工程可行性研究报告"]',
  '    D2 --> D6',
  '    D3 --> D6',
  '    D4 --> D6',
  '    D5 --> D6',
  '  end',
  '  A4 --> B1',
  '  B7 --> C1',
  '  B7 --> C2',
  '  B7 --> C3',
  '  B7 --> C4',
  '  C6 --> D1',
  '  C6 --> D2',
  '  C6 --> D3',
  '  C6 --> D4',
  '  C6 --> D5',
  '  class A1,A2,A3 task;',
  '  class A4,B7,C6,D6 document;',
  '  class B1,B3,B4,B5 monitoring;',
  '  class B2,B6,C5,D1,D2,D3,D4,D5 treatment;',
  '  class C1,C2,C3,C4 risk;',
  '  style P1 fill:#f6f9fc,stroke:#9aafc1,stroke-width:1px,stroke-dasharray:6 4;',
  '  style P2 fill:#f6f9fc,stroke:#9aafc1,stroke-width:1px,stroke-dasharray:6 4;',
  '  style P3 fill:#f6f9fc,stroke:#9aafc1,stroke-width:1px,stroke-dasharray:6 4;',
  '  style P4 fill:#f6f9fc,stroke:#9aafc1,stroke-width:1px,stroke-dasharray:6 4;'
].join('\n')

export const generateProjectOrgMermaid = () => [
  'flowchart TD',
  ...ENV_CLASS_DEFS,
  '  subgraph L1["公司级支撑层"]',
  '    S1["质量部"]',
  '    S2["计划经营部"]',
  '    S3["财务部"]',
  '    S4["修复技术中心"]',
  '    S5["信息管理部"]',
  '    S6["设计研究院"]',
  '    S7["采购部"]',
  '    S8["综合管理部"]',
  '  end',
  '  subgraph L2["项目管理层"]',
  '    PM["项目总负责人"]',
  '  end',
  '  subgraph L3["项目实施层"]',
  '    G1["场调和风评工作组"]',
  '    G2["可研设计组"]',
  '    L11["场调风评负责人"]',
  '    L21["可研设计负责人"]',
  '    T11["现场工作组"]',
  '    T12["技术支持组"]',
  '    T13["勘察工作组"]',
  '    T14["试验组"]',
  '    T21["修复工艺设计组"]',
  '    T22["废水处理工艺组"]',
  '    T23["技经组"]',
  '    T24["药剂研发组"]',
  '  end',
  '  S1 --> PM',
  '  S2 --> PM',
  '  S3 --> PM',
  '  S4 --> PM',
  '  S5 --> PM',
  '  S6 --> PM',
  '  S7 --> PM',
  '  S8 --> PM',
  '  PM --> G1 --> L11',
  '  PM --> G2 --> L21',
  '  L11 --> T11',
  '  L11 --> T12',
  '  L11 --> T13',
  '  L11 --> T14',
  '  L21 --> T21',
  '  L21 --> T22',
  '  L21 --> T23',
  '  L21 --> T24',
  '  class S1,S2,S3,S4,S5,S6,S7,S8 org;',
  '  class PM,L11,L21 leader;',
  '  class G1,G2 team;',
  '  class T11,T12,T13,T14,T21,T22,T23,T24 task;',
  '  style L1 fill:#f6f9fc,stroke:#9aafc1,stroke-width:1px,stroke-dasharray:6 4;',
  '  style L2 fill:#f6f9fc,stroke:#9aafc1,stroke-width:1px,stroke-dasharray:6 4;',
  '  style L3 fill:#f6f9fc,stroke:#9aafc1,stroke-width:1px,stroke-dasharray:6 4;'
].join('\n')

export const generateEnvironmentalMermaid = (nodes, config = {}) => {
  const lines = ['flowchart TD', `  %% ${config.diagramTypeLabel || '环保工程专业流程图'}`, ...ENV_CLASS_DEFS]
  nodes.forEach((node) => lines.push(`  ${nodeSyntax(node)}`))
  nodes.forEach((node, index) => {
    const nextNode = nodes[index + 1]
    if (nextNode) lines.push(`  ${node.id} --> ${nextNode.id}`)
  })
  nodes.forEach((node) => lines.push(`  class ${node.id} ${envClassForLabel(node)};`))
  return lines.join('\n')
}

export const generateMermaid = (nodes, config) => {
  if (config.diagramType === 'basic') return generateBasicMermaid(nodes)
  if (config.diagramType === 'site-survey') return generateSiteSurveyMermaid(nodes, config)
  if (config.diagramType === 'technical-service') return generateTechnicalServiceMermaid(nodes, config)
  if (config.diagramType === 'project-org') return generateProjectOrgMermaid(nodes, config)
  if (['environment-process', 'monitoring', 'eia', 'risk-assessment', 'emergency', 'operation'].includes(config.diagramType)) {
    return generateEnvironmentalMermaid(nodes, config)
  }
  return generateBeautifiedMermaid(nodes, config)
}
