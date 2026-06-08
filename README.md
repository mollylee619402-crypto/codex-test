# FlowCraft 环保工程流程图与组织架构图生成器

## 项目介绍

FlowCraft 是一个纯前端网页小工具，当前升级为「环保工程流程图与组织架构图生成器」。它保留原有 PRD、SOP、产品流程图、系统流程图和基础 Mermaid 生成能力，同时新增面向环保工程技术报告、场地调查报告、风险评估报告、工程可行性研究报告、竣工环保验收报告、运维方案、应急预案和项目管理组织架构图的专业模板。

本项目不需要后端、不需要登录、不调用 OpenAI API，所有数据处理、示例切换和模板保存都在浏览器本地完成。

## 功能说明

- 页面标题升级为「FlowCraft 环保工程流程图与组织架构图生成器」。
- 保留原有基础版、美化版、产品流程图、SOP 流程图和系统流程图。
- 新增 9 类环保工程专业模板：
  - 资料收集与踏勘流程图
  - 技术服务总体流程图
  - 项目组织架构图
  - 环保工艺流程图
  - 环保监测流程图
  - 环评/验收流程图
  - 风险评估流程图
  - 应急处置流程图
  - 运维管理流程图
- 新增 3 个环保工程内置示例，可在输入区直接切换：
  - 资料收集与踏勘工作流程
  - 本项目技术服务工作流程
  - 项目管理机构组织架构图
- 支持自动生成图题、流程说明、关键控制节点和风险/异常节点说明。
- 支持 Mermaid 代码实时预览，渲染失败时显示友好提示并保留源码。
- 支持将常用流程保存为模板，模板通过 `localStorage` 持久化。

## 环保工程专用 Mermaid 样式

项目内置了适合技术报告使用的低饱和色样式，并在专业模板中使用以下 Mermaid class：

- `phase`：阶段容器
- `source`：污染源
- `collection`：收集系统
- `treatment`：处理单元
- `monitoring`：监测点位
- `discharge`：排放或回用
- `waste`：污泥、危废、副产物
- `risk`：异常或风险节点
- `document`：报告、成果、台账
- `org`：组织部门
- `leader`：负责人
- `team`：工作组
- `task`：执行小组

样式原则为低饱和度蓝、绿、灰、浅黄；风险节点使用浅红或浅橙；报告、成果、台账节点稍微突出，避免过于鲜艳的颜色。

## 导出到 Word、PPT、Visio

输出区提供「导出工具栏」：

1. 复制 Mermaid 代码
2. 下载 SVG
3. 下载 PNG
4. 下载 PPTX 可编辑版
5. 下载 Mermaid 源码
6. 复制图题与说明

### SVG

SVG 下载保留 Mermaid 渲染结果，可直接插入 Word、PPT 或 Visio。Mermaid 预览生成的 SVG 会尽量保留文本为 `text` 元素，便于 Office 软件继续处理。文件名会根据图题自动生成，例如：

- `资料收集分析与踏勘工作流程图.svg`
- `本项目技术服务工作流程.svg`
- `项目管理机构组织架构图.svg`

### PNG

PNG 下载会将当前 SVG 预览导出为高清位图，默认使用 3 倍分辨率，适合直接插入 Word 技术报告或验收报告正文。

### PPTX 可编辑版

PPTX 导出使用 `pptxgenjs` 实现，默认 16:9 页面比例。导出文件不是简单插入整张截图，而是生成结构化近似版 PPTX：

- 普通节点使用 PowerPoint 原生矩形/圆角矩形 shape。
- 判断节点使用 PowerPoint 原生菱形 shape。
- 阶段分组使用虚线矩形。
- 箭头使用 PowerPoint 原生线条。
- 标题、图题、说明、关键控制节点、风险或异常节点说明使用文本框。
- 节点文字尽量保持为可编辑文本。

> 说明：复杂 Mermaid 布局在 PPTX 中会按「结构化近似版」重建，颜色、边框和字体会尽量接近网页预览效果。若需要 100% 保留 Mermaid 视觉布局，请下载 SVG；若需要在 PowerPoint 中继续编辑节点文字和形状，请下载 PPTX 可编辑版。

### Mermaid 源码

Mermaid 源码下载会导出 `.mmd` 文件，内容为当前 Mermaid 代码，方便项目资料归档、版本管理和后续继续修改。

### Visio 使用建议

现阶段不直接生成 `.vsdx` 文件：

1. 如果要进入 Visio 调整，推荐先下载 SVG，再插入 Visio。
2. 如果要完全可编辑，推荐下载 PPTX 可编辑版，在 PowerPoint 中调整。
3. 后续可以继续扩展 draw.io XML 或 VSDX 导出。

## 技术栈

- Vite
- React
- Mermaid.js
- PptxGenJS
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

2. 将 `dist/` 目录上传到静态网站服务，例如 GitHub Pages、Vercel、Netlify、Cloudflare Pages 或 Nginx 静态目录。

3. 如果部署在子路径下，可按目标平台要求配置 Vite 的 `base` 路径。

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
    environmentExamples.js
  utils/
    exportSvg.js
    exportPng.js
    exportPptx.js
    fileName.js
    flowParser.js
    mermaidGenerator.js
    promptGenerator.js
    reportMetadataGenerator.js
  components/
    Header.jsx
    InputPanel.jsx
    OutputPanel.jsx
    MermaidPreview.jsx
    TemplateManager.jsx
```

## 后续可扩展方向

- 增加 draw.io XML 导出。
- 增加 VSDX 直接导出。
- 增加节点拖拽排序和手动编辑节点能力。
- 增加更细颗粒度的环保工程工艺单元库。
- 增加批量模板导入导出能力。
