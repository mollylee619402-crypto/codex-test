export const generatePrompt = ({ input, diagramTypeLabel, outputPurpose, style }) => `请基于以下流程描述，生成一个适合「${outputPurpose}」使用的「${diagramTypeLabel}」。

风格要求：${style}，整体采用技术报告风格，优先使用低饱和度蓝、绿、灰、浅黄；风险节点使用浅红或浅橙；报告、成果、台账类节点适当突出。普通步骤使用矩形，判断节点使用菱形，阶段或组织层级可使用 subgraph 容器。

流程描述：
${input}

请输出：
1. Mermaid flowchart 代码
2. 图题和流程说明
3. 关键控制节点
4. 风险或异常节点说明
5. 可用于 Word、PPT、Visio 的导出建议`
