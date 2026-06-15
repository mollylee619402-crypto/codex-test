import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import InputPanel from './components/InputPanel'
import OutputPanel from './components/OutputPanel'
import { DEFAULT_EXAMPLE, DIAGRAM_TYPES } from './data/examples'
import { buildFlowSummary, parseFlowDescription } from './utils/flowParser'
import { downloadEditablePptx } from './utils/exportPptx'
import { PNG_SCALE_OPTIONS, downloadPng } from './utils/exportPng'
import { downloadMermaidSource, downloadSvg } from './utils/exportSvg'
import { generateMermaid } from './utils/mermaidGenerator'
import { getExportDimensions, getExportSizePreset, getReportTemplateConfig, isReportTemplate } from './utils/reportDiagramTemplates'
import { renderReportSvg } from './utils/reportSvgRenderer'
import { generatePrompt } from './utils/promptGenerator'
import { generateReportMetadata, metadataText } from './utils/reportMetadataGenerator'
import { DEFAULT_PROJECT_CONFIG, captionFromProjectConfig, createDefaultStructuredText, mergeProjectConfig } from './utils/projectConfigDefaults.js'
import { parseStructuredInput, structuredContentToMermaidNodes } from './utils/structuredInputParser.js'
import { buildProjectConfigPayload, downloadProjectConfigJson, serializeProjectConfig } from './utils/projectConfigExport.js'
import { normalizeImportedProjectConfig, readProjectConfigFile } from './utils/projectConfigImport.js'
import { deleteProjectConfigFromLibrary, readProjectConfigs, saveProjectConfigToLibrary } from './utils/projectConfigStorage.js'
import { organizeStructuredText } from './utils/structuredTextOrganizer.js'
import { renderBasicFlowSvg } from './utils/basicFlowRenderer.js'

const STORAGE_KEY = 'flowcraft.templates'

function readTemplates() {
  try {
    const savedTemplates = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(savedTemplates) ? savedTemplates : []
  } catch {
    return []
  }
}

function createTemplateId() {
  return crypto.randomUUID?.() || `template-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)

  if (!copied) throw new Error('copy command failed')
}

function App() {
  const [input, setInput] = useState(DEFAULT_EXAMPLE.content)
  const [diagramType, setDiagramType] = useState(DEFAULT_EXAMPLE.diagramType)
  const [outputPurpose, setOutputPurpose] = useState(DEFAULT_EXAMPLE.outputPurpose)
  const [style, setStyle] = useState(DEFAULT_EXAMPLE.style)
  const [mermaidCode, setMermaidCode] = useState('')
  const [summary, setSummary] = useState([])
  const [metadata, setMetadata] = useState(generateReportMetadata(DEFAULT_EXAMPLE, []))
  const [templates, setTemplates] = useState([])
  const [projectConfigs, setProjectConfigs] = useState([])
  const [feedback, setFeedback] = useState('')
  const [currentSvg, setCurrentSvg] = useState('')
  const [isPngExporting, setIsPngExporting] = useState(false)
  const [pngButtonLabel, setPngButtonLabel] = useState('下载 PNG')
  const [exportSize, setExportSize] = useState('word-page')
  const [pngScale, setPngScale] = useState(3)
  const [projectConfig, setProjectConfig] = useState(DEFAULT_PROJECT_CONFIG)
  const [structuredInput, setStructuredInputState] = useState(() => createDefaultStructuredText(DEFAULT_EXAMPLE.diagramType))
  const [diagramContent, setDiagramContent] = useState(() => {
    const initialText = createDefaultStructuredText(DEFAULT_EXAMPLE.diagramType)
    const initialParsed = parseStructuredInput(initialText, { templateType: DEFAULT_EXAMPLE.diagramType })
    return { templateType: DEFAULT_EXAMPLE.diagramType, stages: initialParsed.stages }
  })
  const appliedStructuredInputRef = useRef(structuredInput)
  const [aiVisionResult, setAiVisionResult] = useState(null)
  const [isImageAssistMode, setIsImageAssistMode] = useState(true)
  const [focusRedrawMode, setFocusRedrawMode] = useState(true)
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(true)
  const feedbackTimerRef = useRef(null)

  const diagramTypeLabel = useMemo(
    () => DIAGRAM_TYPES.find((type) => type.value === diagramType)?.label || '基础版流程图',
    [diagramType]
  )

  const config = useMemo(() => ({ diagramType, diagramTypeLabel, outputPurpose, style }), [diagramType, diagramTypeLabel, outputPurpose, style])

  const isReportSvg = useMemo(() => isReportTemplate(diagramType) || diagramType === 'basic', [diagramType])
  const reportConfig = useMemo(() => getReportTemplateConfig(diagramType), [diagramType])
  const exportPreset = useMemo(() => getExportSizePreset(exportSize), [exportSize])
  const reportExportDimensions = useMemo(() => (
    reportConfig ? getExportDimensions(reportConfig, exportPreset) : null
  ), [reportConfig, exportPreset])
  const parsedStructuredInput = useMemo(() => parseStructuredInput(structuredInput, { templateType: diagramType }), [structuredInput, diagramType])
  const displayMetadata = useMemo(() => ({
    ...metadata,
    title: projectConfig.figureTitle || metadata.title,
    caption: captionFromProjectConfig(projectConfig, reportConfig?.caption || metadata.caption),
    description: `${projectConfig.projectName || '本项目'}（${projectConfig.reportUse || outputPurpose}）${metadata.description ? `：${metadata.description}` : ''}`
  }), [metadata, projectConfig, reportConfig, outputPurpose])
  const reportSvg = useMemo(() => {
    if (diagramType === 'basic') return renderBasicFlowSvg(diagramContent, projectConfig, displayMetadata)
    return isReportTemplate(diagramType) ? renderReportSvg(diagramType, input, displayMetadata, projectConfig, diagramContent) : ''
  }, [diagramType, input, displayMetadata, projectConfig, diagramContent])

  const currentProjectConfigPayload = useMemo(() => buildProjectConfigPayload({
    templateType: diagramType,
    projectConfig,
    structuredInput,
    diagramContent,
    exportSizePreset: exportSize,
    pngScale,
    input,
    outputPurpose,
    style,
    aiVisionResult
  }), [diagramType, projectConfig, structuredInput, diagramContent, exportSize, pngScale, input, outputPurpose, style, aiVisionResult])

  const currentProjectConfigJson = useMemo(() => serializeProjectConfig(currentProjectConfigPayload), [currentProjectConfigPayload])

  const showFeedback = useCallback((message, duration = 1800) => {
    setFeedback(message)
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    if (duration > 0) {
      feedbackTimerRef.current = window.setTimeout(() => setFeedback(''), duration)
    }
  }, [])

  const buildDiagramContentFromStructuredInput = useCallback((text, templateType = diagramType) => {
    const source = String(text || '')
    console.log('[FlowCraft] parsing structured input length', source.trim().length)
    const parsed = parseStructuredInput(source, { templateType })
    const nodesCount = parsed.stages.reduce((total, stage) => total + (stage.nodes || []).length + (stage.nodes || []).reduce((childTotal, node) => childTotal + (node.children || []).length, 0), 0)
    console.log('[FlowCraft] parsed stages count', parsed.stages.length)
    console.log('[FlowCraft] parsed nodes count', nodesCount)
    return { diagramContent: { templateType, stages: parsed.stages }, parsed }
  }, [diagramType])

  const setStructuredInput = useCallback((nextValue) => {
    setStructuredInputState(nextValue)
    console.log('[FlowCraft] structured input updated')
    const nextText = typeof nextValue === 'function' ? nextValue(structuredInput) : nextValue
    const { diagramContent: nextDiagramContent } = buildDiagramContentFromStructuredInput(nextText, diagramType)
    setDiagramContent(nextDiagramContent)
    console.log('[FlowCraft] preview data updated')
    console.log('[FlowCraft] preview template type', diagramType)
  }, [buildDiagramContentFromStructuredInput, diagramType, structuredInput])

  const generate = useCallback((source = input, nextConfig = config, nextDiagramContent = null) => {
    setIsPreviewCollapsed(false)
    let effectiveDiagramContent = nextDiagramContent || diagramContent
    if ((isReportTemplate(nextConfig.diagramType) || nextConfig.diagramType === 'basic') && !nextDiagramContent && appliedStructuredInputRef.current !== structuredInput) {
      const parsedResult = buildDiagramContentFromStructuredInput(structuredInput, nextConfig.diagramType)
      effectiveDiagramContent = parsedResult.diagramContent
      setDiagramContent(effectiveDiagramContent)
      appliedStructuredInputRef.current = structuredInput
      console.log('[FlowCraft] preview data updated')
      console.log('[FlowCraft] preview template type', nextConfig.diagramType)
    }
    const nodes = (isReportTemplate(nextConfig.diagramType) || nextConfig.diagramType === 'basic')
      ? structuredContentToMermaidNodes(effectiveDiagramContent)
      : parseFlowDescription(source)
    setMermaidCode(generateMermaid(nodes, nextConfig))
    setSummary(buildFlowSummary(nodes, nextConfig))
    setMetadata(generateReportMetadata(nextConfig, nodes))
    const errors = parseStructuredInput(structuredInput, { templateType: nextConfig.diagramType }).errors
    if (isReportTemplate(nextConfig.diagramType) && errors.length) {
      showFeedback(`结构化节点已生成，提示：${errors[0]}`, 3200)
    }
  }, [input, config, diagramContent, structuredInput, buildDiagramContentFromStructuredInput, showFeedback])

  useEffect(() => {
    setTemplates(readTemplates())
    try {
      setProjectConfigs(readProjectConfigs())
    } catch (error) {
      setProjectConfigs([])
      window.setTimeout(() => showFeedback(error?.message || '本地存储失败，请检查浏览器权限或空间', 3600), 0)
    }
    const initialConfig = {
      diagramType: DEFAULT_EXAMPLE.diagramType,
      diagramTypeLabel: DIAGRAM_TYPES.find((type) => type.value === DEFAULT_EXAMPLE.diagramType)?.label || '资料收集与踏勘流程图',
      outputPurpose: DEFAULT_EXAMPLE.outputPurpose,
      style: DEFAULT_EXAMPLE.style
    }
    const initialParsed = parseStructuredInput(createDefaultStructuredText(DEFAULT_EXAMPLE.diagramType), { templateType: DEFAULT_EXAMPLE.diagramType })
    const nodes = (isReportTemplate(DEFAULT_EXAMPLE.diagramType) || DEFAULT_EXAMPLE.diagramType === 'basic') ? structuredContentToMermaidNodes(initialParsed) : parseFlowDescription(DEFAULT_EXAMPLE.content)
    setMermaidCode(generateMermaid(nodes, initialConfig))
    setSummary(buildFlowSummary(nodes, initialConfig))
    setMetadata(generateReportMetadata(initialConfig, nodes))

    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const saveTemplates = (nextTemplates) => {
    setTemplates(nextTemplates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTemplates))
  }

  const applyExample = (example) => {
    setInput(example.content)
    setDiagramType(example.diagramType)
    setOutputPurpose(example.outputPurpose)
    setStyle(example.style)
    const nextProjectConfig = mergeProjectConfig(projectConfig, example.projectConfig || {})
    const nextStructuredInput = example.structuredInput || createDefaultStructuredText(example.diagramType)
    setProjectConfig(nextProjectConfig)
    setStructuredInput(nextStructuredInput)
    setAiVisionResult(null)
    const nextParsed = parseStructuredInput(nextStructuredInput, { templateType: example.diagramType })
    const label = DIAGRAM_TYPES.find((type) => type.value === example.diagramType)?.label || '环保工程流程图'
    generate(example.content, { diagramType: example.diagramType, diagramTypeLabel: label, outputPurpose: example.outputPurpose, style: example.style }, { templateType: example.diagramType, stages: nextParsed.stages })
    showFeedback('环保工程示例已加载')
  }

  const handleSaveTemplate = () => {
    if (!input.trim()) {
      showFeedback('请先输入流程内容')
      return
    }

    const templateName = window.prompt('请输入模板名称', DEFAULT_EXAMPLE.name)
    if (!templateName) return

    const nextTemplates = [
      {
        id: createTemplateId(),
        name: templateName,
        input,
        diagramType,
        outputPurpose,
        style,
        projectConfig,
        structuredInput,
        aiVisionResult,
        createdAt: new Date().toISOString()
      },
      ...templates
    ].slice(0, 12)

    saveTemplates(nextTemplates)
    showFeedback('模板已保存')
  }

  const handleLoadTemplate = (template) => {
    setInput(template.input)
    setDiagramType(template.diagramType)
    setOutputPurpose(template.outputPurpose)
    setStyle(template.style)
    setProjectConfig(mergeProjectConfig(projectConfig, template.projectConfig || {}))
    const nextStructuredInput = template.structuredInput || createDefaultStructuredText(template.diagramType)
    setStructuredInput(nextStructuredInput)
    setAiVisionResult(template.aiVisionResult || null)
    const nextParsed = parseStructuredInput(nextStructuredInput, { templateType: template.diagramType })
    const label = DIAGRAM_TYPES.find((type) => type.value === template.diagramType)?.label || '基础版流程图'
    generate(template.input, { diagramType: template.diagramType, diagramTypeLabel: label, outputPurpose: template.outputPurpose, style: template.style }, { templateType: template.diagramType, stages: nextParsed.stages })
    showFeedback('模板已加载')
  }

  const handleDeleteTemplate = (id) => {
    saveTemplates(templates.filter((template) => template.id !== id))
    showFeedback('模板已删除')
  }


  const applyProjectConfigPayload = (rawConfig, message = '项目配置已加载') => {
    const normalized = normalizeImportedProjectConfig(rawConfig)
    const nextTemplateType = normalized.templateType
    const nextProjectConfig = mergeProjectConfig(DEFAULT_PROJECT_CONFIG, normalized.projectConfig)
    const nextStructuredInput = normalized.structuredInput || createDefaultStructuredText(nextTemplateType)
    const nextInput = normalized.input || `${nextProjectConfig.projectName}，${nextProjectConfig.figureTitle}`
    const nextLabel = DIAGRAM_TYPES.find((type) => type.value === nextTemplateType)?.label || '基础版流程图'
    const nextOutputPurpose = normalized.outputPurpose || nextProjectConfig.reportUse || outputPurpose
    const nextStyle = normalized.style || style
    const nextParsed = parseStructuredInput(nextStructuredInput, { templateType: nextTemplateType })

    setInput(nextInput)
    setDiagramType(nextTemplateType)
    setOutputPurpose(nextOutputPurpose)
    setStyle(nextStyle)
    setProjectConfig(nextProjectConfig)
    setStructuredInput(nextStructuredInput)
    setAiVisionResult(normalized.aiVisionResult || null)
    setExportSize(normalized.exportSettings.exportSizePreset)
    setPngScale(normalized.exportSettings.pngScale)
    generate(nextInput, { diagramType: nextTemplateType, diagramTypeLabel: nextLabel, outputPurpose: nextOutputPurpose, style: nextStyle }, { templateType: nextTemplateType, stages: nextParsed.stages })
    showFeedback(message, 2600)
  }

  const handleSaveProjectConfig = () => {
    try {
      const result = saveProjectConfigToLibrary(currentProjectConfigPayload)
      setProjectConfigs(result.configs)
      showFeedback(result.mode === 'updated' ? '项目配置已保存（已更新同名配置）' : '项目配置已保存', 2600)
    } catch (error) {
      showFeedback(error?.message || '本地存储失败，请检查浏览器权限或空间', 4200)
    }
  }

  const handleLoadProjectConfig = (config) => {
    try {
      applyProjectConfigPayload(config, '项目配置已加载')
    } catch (error) {
      showFeedback(error?.message || '项目配置加载失败，请检查配置内容', 4200)
    }
  }

  const handleDeleteProjectConfig = (id) => {
    try {
      setProjectConfigs(deleteProjectConfigFromLibrary(id))
      showFeedback('项目配置已删除')
    } catch (error) {
      showFeedback(error?.message || '本地存储失败，请检查浏览器权限或空间', 4200)
    }
  }

  const handleExportCurrentProjectConfig = () => {
    try {
      downloadProjectConfigJson(currentProjectConfigPayload)
      showFeedback('JSON 配置已导出')
    } catch (error) {
      showFeedback(`JSON 配置导出失败：${error?.message || '请检查浏览器下载权限'}`, 4200)
    }
  }

  const handleExportProjectConfig = (config) => {
    try {
      downloadProjectConfigJson(config)
      showFeedback('JSON 配置已导出')
    } catch (error) {
      showFeedback(`JSON 配置导出失败：${error?.message || '请检查浏览器下载权限'}`, 4200)
    }
  }

  const handleCopyProjectConfigJson = () => {
    copyText(currentProjectConfigJson, '配置 JSON 已复制')
  }

  const handleImportProjectConfig = async (file) => {
    try {
      const importedConfig = await readProjectConfigFile(file)
      applyProjectConfigPayload(importedConfig, 'JSON 配置已导入')
    } catch (error) {
      showFeedback(error?.message || 'JSON 解析失败，请检查文件格式', 5200)
    }
  }


  const handleDetectedOcrCaption = (caption = {}) => {
    if (!caption.figureNumber && !caption.figureTitle) return
    setProjectConfig((current) => ({
      ...current,
      figureNumber: caption.figureNumber || current.figureNumber,
      figureTitle: caption.figureTitle || current.figureTitle,
      exportBaseName: current.exportBaseName
    }))
    showFeedback('已从 OCR 识别结果同步图号和图题到项目参数设置', 2800)
  }

  const handleApplyImageImport = (recognizedText, visionResult = null) => {
    const nextStructuredInput = String(recognizedText || '').trim()
    if (!nextStructuredInput) {
      showFeedback('未识别到有效文字，暂无可应用内容。', 2600)
      return
    }
    if (visionResult?.figureNumber || visionResult?.figureTitle) {
      setProjectConfig((current) => ({
        ...current,
        figureNumber: visionResult.figureNumber || current.figureNumber,
        figureTitle: visionResult.figureTitle || current.figureTitle,
        exportBaseName: current.exportBaseName
      }))
    }
    setDiagramType('basic')
    setAiVisionResult(visionResult || null)
    const organized = organizeStructuredText(nextStructuredInput)
    const fallbackImageText = `阶段一：图片识别结果\n${nextStructuredInput.split(/\r?\n/).filter(Boolean).map((line) => `* ${line.trim()}`).join('\n')}`
    setStructuredInput(organized.text || fallbackImageText)
    setInput(nextStructuredInput.replace(/^\s*[*-]\s*/gm, '').replace(/\n{2,}/g, '\n'))
    showFeedback(visionResult ? 'AI 识图结果已应用到结构化节点编辑区' : '图片识别结果已应用到结构化节点编辑区', 2600)
  }


  const handleDetectedVisionTemplate = (templateType) => {
    if (!templateType || !DIAGRAM_TYPES.some((type) => type.value === templateType)) return
    setDiagramType(templateType)
    showFeedback('已根据 AI 识图结果同步流程图类型', 2200)
  }

  const handleDiagramTypeChange = (nextDiagramType) => {
    const effectiveType = nextDiagramType === 'blank' ? 'basic' : nextDiagramType
    setDiagramType(effectiveType)
    const nextReportConfig = getReportTemplateConfig(effectiveType)
    if (nextReportConfig) {
      const [figureNumber, ...titleParts] = nextReportConfig.caption.split(/\s+/)
      setProjectConfig((current) => ({
        ...current,
        figureNumber: figureNumber || current.figureNumber,
        figureTitle: titleParts.join(' ') || nextReportConfig.name,
        exportBaseName: current.exportBaseName
      }))
      // 切换模板只同步图题/项目参数，不自动覆盖第 3 步结构化内容。
    }
  }

  const handleOrganizeText = (source = input) => {
    console.log('[FlowCraft] organize text clicked')
    const rawSource = typeof source === 'string' ? source : input
    console.log('[FlowCraft] raw input length', rawSource.length)
    if (!rawSource.trim()) {
      showFeedback('请先输入流程内容。')
      return
    }
    const { text, caption } = organizeStructuredText(rawSource)
    console.log('[FlowCraft] structured result length', text.length)
    if (!text) {
      showFeedback('没有可整理的有效内容')
      return
    }
    setStructuredInput(text)
    console.log('[FlowCraft] structured content updated')
    window.setTimeout(() => document.getElementById('structured-input')?.focus(), 0)
    if (caption.figureNumber || caption.figureTitle) {
      setProjectConfig((current) => ({
        ...current,
        figureNumber: caption.figureNumber || current.figureNumber,
        figureTitle: caption.figureTitle || current.figureTitle,
        exportBaseName: current.exportBaseName
      }))
      showFeedback('已整理为结构化内容，并同步图号和图题')
      return
    }
    showFeedback('已整理为结构化内容')
  }

  const handleApplyStructuredInput = () => {
    console.log('[FlowCraft] apply current flow clicked')
    setDiagramContent({ templateType: diagramType, stages: [] })
    console.log('[FlowCraft] previous diagramContent cleared')
    const { diagramContent: nextDiagramContent, parsed } = buildDiagramContentFromStructuredInput(structuredInput, diagramType)
    if (parsed.errors.length) {
      showFeedback(`结构化内容解析失败：${parsed.errors[0]}`, 4200)
      return
    }
    setDiagramContent(nextDiagramContent)
    appliedStructuredInputRef.current = structuredInput
    console.log('[FlowCraft] preview data updated')
    console.log('[FlowCraft] preview template type', diagramType)
    setInput(structuredInput.replace(/^\s*[*-]\s*/gm, '').replace(/\n{2,}/g, '\n'))
    generate(structuredInput, config, nextDiagramContent)
    showFeedback('已应用当前结构化内容。')
  }

  const copyText = async (text, message) => {
    try {
      await writeClipboardText(text)
      showFeedback(message)
    } catch {
      showFeedback('复制失败，请手动选择内容复制')
    }
  }

  const handleCopyPrompt = () => {
    copyText(generatePrompt({ input, diagramTypeLabel, outputPurpose, style }), '提示词已复制')
  }

  const exportBaseName = useMemo(() => {
    if (projectConfig.exportBaseName?.trim()) return projectConfig.exportBaseName.trim()
    if (isReportSvg) {
      const projectShortName = (projectConfig.projectName || '').replace(/项目$/, '') || '项目'
      const title = projectConfig.figureTitle || displayMetadata.title
      return `${projectShortName}_${title}`
    }
    return displayMetadata.title
  }, [isReportSvg, projectConfig, displayMetadata.title])

  const handleDownloadSvg = () => {
    const exportSvg = isReportSvg ? reportSvg : currentSvg
    if (!exportSvg) {
      showFeedback('当前没有可下载的 SVG')
      return
    }
    try {
      downloadSvg(exportSvg, exportBaseName, {
        exportDimensions: isReportSvg ? reportExportDimensions : null,
        targetWidth: exportPreset.targetWidth,
        exportSize
      })
      showFeedback('SVG 下载已开始')
    } catch (error) {
      showFeedback(`SVG 下载失败：${error?.message || '未检测到有效 SVG'}`)
    }
  }

  const handleDownloadPng = async () => {
    console.log('PNG export clicked')
    const exportSvg = isReportSvg ? reportSvg : currentSvg
    if (!exportSvg) {
      showFeedback('请先生成流程图后再下载 PNG')
      return
    }

    setIsPngExporting(true)
    setPngButtonLabel('正在导出高清 PNG…')
    showFeedback('正在导出高清 PNG…', 0)

    try {
      const result = await downloadPng(exportSvg, exportBaseName, {
        scale: pngScale,
        targetWidth: exportPreset.targetWidth,
        exportDimensions: isReportSvg ? reportExportDimensions : null,
        exportSize,
        templateType: diagramType,
        isReportSvg
      })
      setPngButtonLabel('PNG 下载已开始')
      const downgradedMessage = result?.downgraded ? `（文件过大，已由 ${result.requestedScale}x 自动降级）` : ''
      showFeedback(`PNG 下载已开始，清晰度：${result?.scale || pngScale}x${downgradedMessage}`, 3200)
    } catch (error) {
      console.error('PNG export failed', error)
      const message = error?.message || '未知错误'
      const friendlyMessage = pngScale === 4
        ? '打印级 PNG 导出失败，请尝试高清 2x 或超清 3x。'
        : (message.startsWith('PNG 导出失败') ? message : `PNG 导出失败：${message}`)
      setPngButtonLabel('下载 PNG')
      showFeedback(`${friendlyMessage}，建议下载 SVG 或 PPTX 可编辑版后插入 Word/PPT。`, 6200)
    } finally {
      setIsPngExporting(false)
    }
  }

  const handleDownloadPptx = async () => {
    try {
      await downloadEditablePptx({ mermaidCode, metadata: { ...displayMetadata, title: exportBaseName }, summary, diagramType, exportSize, projectConfig, diagramContent })
      const mode = reportConfig?.pptxMode === 'native' ? '' : '（该模板暂使用 SVG 图形插入，部分元素可能不可编辑）'
      showFeedback(`PPTX 下载已开始${mode}`)
    } catch (error) {
      showFeedback(`PPTX 导出失败：${error?.message || '请检查浏览器下载权限'}`)
    }
  }

  const handleDownloadMermaid = () => {
    try {
      downloadMermaidSource(mermaidCode, exportBaseName)
      showFeedback('Mermaid 源码下载已开始')
    } catch (error) {
      showFeedback(`Mermaid 源码下载失败：${error?.message || '源码为空'}`)
    }
  }

  const applyProjectPreset = (preset) => {
    applyExample(preset)
    showFeedback('项目示例已一键套用')
  }

  const resetExample = () => {
    applyExample(DEFAULT_EXAMPLE)
    showFeedback('已重置示例')
  }

  return (
    <div className="app">
      <Header />
      <main className={`workspace ${isImageAssistMode ? 'is-image-assist-mode' : ''} ${focusRedrawMode ? 'is-focus-redraw' : ''} ${isPreviewCollapsed ? 'is-preview-collapsed' : ''}`}>
        <InputPanel
          input={input}
          setInput={setInput}
          diagramType={diagramType}
          setDiagramType={handleDiagramTypeChange}
          outputPurpose={outputPurpose}
          setOutputPurpose={setOutputPurpose}
          style={style}
          setStyle={setStyle}
          onGenerate={() => generate()}
          onClear={() => setInput('')}
          onSaveTemplate={handleSaveTemplate}
          onLoadEnvironmentExample={applyExample}
          projectConfig={projectConfig}
          setProjectConfig={setProjectConfig}
          structuredInput={structuredInput}
          setStructuredInput={setStructuredInput}
          parserErrors={parsedStructuredInput.errors}
          onApplyProjectPreset={applyProjectPreset}
          templates={templates}
          onLoadTemplate={handleLoadTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          projectConfigs={projectConfigs}
          currentConfigJson={currentProjectConfigJson}
          onSaveProjectConfig={handleSaveProjectConfig}
          onLoadProjectConfig={handleLoadProjectConfig}
          onDeleteProjectConfig={handleDeleteProjectConfig}
          onExportCurrentProjectConfig={handleExportCurrentProjectConfig}
          onExportProjectConfig={handleExportProjectConfig}
          onCopyProjectConfigJson={handleCopyProjectConfigJson}
          onImportProjectConfig={handleImportProjectConfig}
          onApplyImageImport={handleApplyImageImport}
          onDetectedOcrCaption={handleDetectedOcrCaption}
          onDetectedVisionTemplate={handleDetectedVisionTemplate}
          onVisionResult={setAiVisionResult}
          onOrganizeText={handleOrganizeText}
          onApplyStructuredInput={handleApplyStructuredInput}
          isImageAssistMode={isImageAssistMode}
          onImageAssistModeChange={setIsImageAssistMode}
          focusRedrawMode={focusRedrawMode}
          onFocusRedrawModeChange={setFocusRedrawMode}
        />
        <OutputPanel
          mermaidCode={mermaidCode}
          setMermaidCode={setMermaidCode}
          summary={summary}
          metadata={displayMetadata}
          metadataText={metadataText(displayMetadata)}
          onCopyCode={() => copyText(mermaidCode, 'Mermaid 代码已复制')}
          onCopyPrompt={handleCopyPrompt}
          onCopyMetadata={() => copyText(isReportSvg && reportConfig ? `图题：${displayMetadata.caption}\n\n项目名称：${projectConfig.projectName || '未填写'}\n报告用途：${projectConfig.reportUse || outputPurpose}\n说明：本图为报告版 SVG 模板生成，适合插入 Word、PPT 或 Visio 后进行微调。${reportConfig.description ? `\n${reportConfig.description}` : ''}` : metadataText(displayMetadata), '图题与说明已复制')}
          onDownloadSvg={handleDownloadSvg}
          onDownloadPng={handleDownloadPng}
          isPngExporting={isPngExporting}
          pngButtonLabel={pngButtonLabel}
          pngScale={pngScale}
          setPngScale={setPngScale}
          pngScaleOptions={PNG_SCALE_OPTIONS}
          onDownloadPptx={handleDownloadPptx}
          onDownloadMermaid={handleDownloadMermaid}
          onResetExample={resetExample}
          onGenerate={() => generate()}
          feedback={feedback}
          onSvgReady={setCurrentSvg}
          reportSvg={reportSvg}
          isReportSvg={isReportSvg}
          diagramType={diagramType}
          exportSize={exportSize}
          setExportSize={setExportSize}
          collapsed={isPreviewCollapsed}
          onToggleCollapsed={() => setIsPreviewCollapsed((current) => !current)}
        />
      </main>
    </div>
  )
}

export default App
