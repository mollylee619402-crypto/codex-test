export const generatePrompt = ({ input, diagramTypeLabel, outputPurpose, style }) => `请基于以下流程描述，生成一个适合「${outputPurpose}」使用的「${diagramTypeLabel}」。

风格要求：${style}，节点名称简洁，判断节点使用菱形，普通步骤使用矩形。

流程描述：
${input}

请输出：
1. Mermaid flowchart TD 代码
2. 流程说明
3. 可用于 PPT 或文档的优化建议`
