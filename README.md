# FlowCraft 环保工程流程图与组织架构图生成器

## 项目介绍

FlowCraft 是一个纯前端网页小工具，当前升级为「环保工程流程图与组织架构图生成器」。它保留原有 PRD、SOP、产品流程图、系统流程图和基础 Mermaid 生成能力，同时新增面向环保工程技术报告、场地调查报告、风险评估报告、工程可行性研究报告、竣工环保验收报告、运维方案、应急预案和项目管理组织架构图的专业模板。

本项目默认仍可作为前端工具使用；手动编辑、本地 OCR、示例切换、模板保存和导出能力均在浏览器本地完成。若启用“AI 识图生成流程图”，需要通过 Vercel Serverless Function 在服务端调用 OpenAI 图像输入模型，API Key 只从服务端环境变量读取，不会暴露到前端。

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
- 图片识别生成模块新增 3 种识别方式：
  - AI 识图推荐：适合复杂中文流程图，可理解图号、图题、分组、阶段和节点层级。
  - 本地 OCR 备用：保留 Tesseract.js 整图识别、自动分块识别和手动框选识别，适合简单截图。
  - 手动编辑：无需上传到服务端，直接人工整理结构化节点。
- AI 识图结果会填入结构化节点编辑区，并同步图号、图题和识别警告；用户校对后可继续生成 SVG / 高清 PNG / PPTX。

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
- Vercel Serverless Function（用于可选 AI 识图）
- OpenAI Responses API 图像输入（服务端调用）
- Mermaid.js
- PptxGenJS
- Tesseract.js（本地 OCR 备用）
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


## AI 识图配置（可选）

FlowCraft 新增“AI 识图推荐”模式，用于识别复杂中文流程图、图号、图题、阶段分组和节点层级。该模式会将图片发送到服务端 API，再由服务端调用支持图像输入的 OpenAI 模型处理。

### Vercel 环境变量

如需使用 AI 识图功能，请在 Vercel 项目中配置环境变量：

```text
OPENAI_API_KEY=你的 API Key
```

配置后重新部署项目。API Key 仅由 `api/vision-extract.js` 在服务端读取，前端代码不会包含明文 API Key。

可选环境变量：

```text
OPENAI_VISION_MODEL=gpt-5
```

如果未配置 `OPENAI_API_KEY`，点击“AI 识图生成”时会提示：

```text
AI 识图未配置，请在 Vercel 环境变量中配置 OPENAI_API_KEY，或继续使用本地 OCR / 手动编辑。
```

此时 FlowCraft 仍可继续使用：

1. 手动结构化编辑
2. 本地 OCR
3. 报告版 SVG / PNG / PPTX 导出
4. 项目配置管理

### 隐私提示

AI 识图会将图片发送至服务端模型处理，请勿上传包含敏感信息或涉密内容的图片。若图片过大，请先裁剪关键区域或提高截图清晰度后重试。

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

FlowCraft 的核心功能可以部署到任意静态托管平台；若要使用 AI 识图，请部署到支持 `api/vision-extract.js` 的 Vercel 或兼容 Serverless Function 的平台：

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
