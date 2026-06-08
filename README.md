# FlowCraft：流程图模板生成器

## 项目介绍

FlowCraft 是一个纯前端网页小工具，面向产品经理、运营、项目管理人员和 SOP 编写者。用户可以粘贴流程描述、PRD、会议纪要或 SOP，选择流程图类型、输出用途与视觉风格，然后在浏览器本地生成 Mermaid 流程图代码并实时预览。

本项目不需要后端、不需要登录、不调用 OpenAI API，所有数据处理和模板保存都在浏览器本地完成。

## 功能说明

- 默认加载「小红书 AI 求职账号转化流程」示例内容。
- 支持生成基础版 Mermaid 流程图：默认使用 `flowchart TD`，自动识别判断关键词并生成菱形节点。
- 支持生成美化版 Mermaid 流程图：使用 `subgraph` 阶段分组与 `classDef` 节点样式。
- 支持产品流程图、SOP 流程图、系统流程图等模板入口，便于后续扩展差异化规则。
- 支持 Mermaid 代码实时预览，渲染失败时显示友好提示并保留代码。
- 支持复制 Mermaid 代码、复制提示词、下载当前预览 SVG。
- 支持将常用流程保存为模板，模板通过 `localStorage` 持久化，刷新页面后仍可使用。
- 使用原生 CSS 实现左右分栏、白色卡片、浅蓝灰背景、轻微阴影和桌面端优先体验。

## 技术栈

- Vite
- React
- Mermaid.js
- 原生 CSS
- localStorage

## 安装依赖

```bash
npm install
```

### 关于当前 Codex 环境的说明

当前 Codex 执行环境访问 npm registry 时可能返回 HTTP 403，这是网络/代理策略限制，不代表项目依赖配置或代码本身一定有问题。若在该环境中无法完成 `npm install`，请换到可正常访问 npm registry 的环境继续验证，例如：

- 本地电脑开发环境
- GitHub Codespaces
- Vercel 构建环境
- Netlify 构建环境

在上述环境中重新执行 `npm install`、`npm run dev` 和 `npm run build` 即可完成安装、预览与构建验证。

## 本地运行

```bash
npm run dev
```

启动后按终端提示打开本地地址，通常是：

```text
http://localhost:5173/
```

## 构建

```bash
npm run build
```

构建产物会输出到 `dist/` 目录。

## 部署到静态网站

FlowCraft 是纯前端应用，可以部署到任意静态托管平台：

1. 执行构建：

   ```bash
   npm run build
   ```

2. 将 `dist/` 目录上传到静态网站服务，例如：
   - GitHub Pages
   - Vercel
   - Netlify
   - Cloudflare Pages
   - Nginx 静态目录

3. 如果部署在子路径下，可按目标平台要求配置 Vite 的 `base` 路径。

## 如何扩展新的流程图模板

当前项目将流程解析、Mermaid 生成和提示词生成拆分为独立工具模块，方便扩展：

```text
src/
  data/
    examples.js              # 内置示例、流程图类型、用途、风格选项
  utils/
    flowParser.js            # 文本拆分、节点识别、说明生成
    mermaidGenerator.js      # 基础版与美化版 Mermaid 生成规则
    promptGenerator.js       # 提示词生成规则
```

扩展新模板的建议步骤：

1. 在 `src/data/examples.js` 中新增模板类型选项。
2. 在 `src/utils/flowParser.js` 中增加关键词识别规则，例如审批类、异常类、系统状态类。
3. 在 `src/utils/mermaidGenerator.js` 中新增对应生成函数，例如泳道图、系统链路图、审批流程图。
4. 在 `generateMermaid` 中根据新模板类型分发到对应生成函数。
5. 如需保存更多配置字段，可扩展 `App.jsx` 中保存到 `localStorage` 的模板结构。

## 后续可扩展方向

- 增加更多流程图类型：泳道图、用户旅程图、审批流、系统架构链路图。
- 增加节点拖拽排序和手动编辑节点能力。
- 支持导出 PNG、Markdown 或完整 PRD 片段。
- 支持更多主题色板，并按「PRD / PPT / 小红书 / SOP」自动切换样式。
- 增加 Mermaid 语法校验和更详细的错误定位。
- 增加批量模板导入导出能力。
- 支持浏览器 IndexedDB 保存更大的流程库。

## 目录结构

```text
package.json
index.html
vite.config.js
README.md
src/
  main.jsx
  App.jsx
  styles.css
  data/
    examples.js
  utils/
    flowParser.js
    mermaidGenerator.js
    promptGenerator.js
  components/
    InputPanel.jsx
    OutputPanel.jsx
    MermaidPreview.jsx
    TemplateManager.jsx
    Header.jsx
```
