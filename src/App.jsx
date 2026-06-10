import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import InputPanel from './components/InputPanel'
import OutputPanel from './components/OutputPanel'
import { DEFAULT_EXAMPLE, DIAGRAM_TYPES } from './data/examples'
import { buildFlowSummary, parseFlowDescription } from './utils/flowParser'
import { downloadEditablePptx } from './utils/exportPptx'
import { downloadPng } from './utils/exportPng'
import { downloadMermaidSource, downloadSvg } from './utils/exportSvg'
import { generateMermaid } from './utils/mermaidGenerator'
import { getExportDimensions, getExportSizePreset, getReportTemplateConfig, getReportTemplateExportBaseName, isReportTemplate } from './utils/reportDiagramTemplates'
import { renderReportSvg } from './utils/reportSvgRenderer'
import { generatePrompt } from './utils/promptGenerator'
import { generateReportMetadata, metadataText } from './utils/reportMetadataGenerator'

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
  const [feedback, setFeedback] = useState('')
  const [currentSvg, setCurrentSvg] = useState('')
  const [isPngExporting, setIsPngExporting] = useState(false)
  const [pngButtonLabel, setPngButtonLabel] = useState('下载 PNG')
  const [exportSize, setExportSize] = useState('word-page')
  const feedbackTimerRef = useRef(null)

  const diagramTypeLabel = useMemo(
    () => DIAGRAM_TYPES.find((type) => type.value === diagramType)?.label || '基础版流程图',
    [diagramType]
  )

  const config = useMemo(() => ({ diagramType, diagramTypeLabel, outputPurpose, style }), [diagramType, diagramTypeLabel, outputPurpose, style])

  const isReportSvg = useMemo(() => isReportTemplate(diagramType), [diagramType])
  const reportConfig = useMemo(() => getReportTemplateConfig(diagramType), [diagramType])
  const exportPreset = useMemo(() => getExportSizePreset(exportSize), [exportSize])
  const reportExportDimensions = useMemo(() => (
    reportConfig ? getExportDimensions(reportConfig, exportPreset) : null
  ), [reportConfig, exportPreset])
  const reportSvg = useMemo(() => (
    isReportSvg ? renderReportSvg(diagramType, input, { ...metadata, caption: reportConfig?.caption || metadata.caption }) : ''
  ), [diagramType, input, metadata, reportConfig, isReportSvg])

  const showFeedback = useCallback((message, duration = 1800) => {
    setFeedback(message)
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    if (duration > 0) {
      feedbackTimerRef.current = window.setTimeout(() => setFeedback(''), duration)
    }
  }, [])

  const generate = useCallback((source = input, nextConfig = config) => {
    const nodes = parseFlowDescription(source)
    setMermaidCode(generateMermaid(nodes, nextConfig))
    setSummary(buildFlowSummary(nodes, nextConfig))
    setMetadata(generateReportMetadata(nextConfig, nodes))
  }, [input, config])

  useEffect(() => {
    setTemplates(readTemplates())
    const initialConfig = {
      diagramType: DEFAULT_EXAMPLE.diagramType,
      diagramTypeLabel: DIAGRAM_TYPES.find((type) => type.value === DEFAULT_EXAMPLE.diagramType)?.label || '资料收集与踏勘流程图',
      outputPurpose: DEFAULT_EXAMPLE.outputPurpose,
      style: DEFAULT_EXAMPLE.style
    }
    const nodes = parseFlowDescription(DEFAULT_EXAMPLE.content)
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
    const label = DIAGRAM_TYPES.find((type) => type.value === example.diagramType)?.label || '环保工程流程图'
    generate(example.content, { diagramType: example.diagramType, diagramTypeLabel: label, outputPurpose: example.outputPurpose, style: example.style })
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
    const label = DIAGRAM_TYPES.find((type) => type.value === template.diagramType)?.label || '基础版流程图'
    generate(template.input, { diagramType: template.diagramType, diagramTypeLabel: label, outputPurpose: template.outputPurpose, style: template.style })
    showFeedback('模板已加载')
  }

  const handleDeleteTemplate = (id) => {
    saveTemplates(templates.filter((template) => template.id !== id))
    showFeedback('模板已删除')
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

  const exportBaseName = useMemo(() => (
    isReportSvg ? getReportTemplateExportBaseName(diagramType, metadata.title) : metadata.title
  ), [diagramType, isReportSvg, metadata.title])

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
    setPngButtonLabel('正在导出 PNG...')
    showFeedback('正在导出 PNG...', 0)

    try {
      await downloadPng(exportSvg, exportBaseName, {
        scale: 3,
        targetWidth: exportPreset.targetWidth,
        exportDimensions: isReportSvg ? reportExportDimensions : null,
        exportSize,
        templateType: diagramType,
        isReportSvg
      })
      setPngButtonLabel('PNG 下载已开始')
      showFeedback('PNG 下载已开始', 2600)
    } catch (error) {
      console.error('PNG export failed', error)
      const message = error?.message || '未知错误'
      const friendlyMessage = message.startsWith('PNG 导出失败') ? message : `PNG 导出失败：${message}`
      setPngButtonLabel('下载 PNG')
      showFeedback(`${friendlyMessage}，建议下载 SVG 或 PPTX 可编辑版后插入 Word/PPT。`, 6200)
    } finally {
      setIsPngExporting(false)
    }
  }

  const handleDownloadPptx = async () => {
    try {
      await downloadEditablePptx({ mermaidCode, metadata: { ...metadata, title: exportBaseName }, summary, diagramType, exportSize })
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

  const resetExample = () => {
    applyExample(DEFAULT_EXAMPLE)
    showFeedback('已重置示例')
  }

  return (
    <div className="app">
      <Header />
      <main className="workspace">
        <InputPanel
          input={input}
          setInput={setInput}
          diagramType={diagramType}
          setDiagramType={setDiagramType}
          outputPurpose={outputPurpose}
          setOutputPurpose={setOutputPurpose}
          style={style}
          setStyle={setStyle}
          onGenerate={() => generate()}
          onClear={() => setInput('')}
          onSaveTemplate={handleSaveTemplate}
          onLoadEnvironmentExample={applyExample}
          templates={templates}
          onLoadTemplate={handleLoadTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
        <OutputPanel
          mermaidCode={mermaidCode}
          setMermaidCode={setMermaidCode}
          summary={summary}
          metadata={metadata}
          metadataText={metadataText(metadata)}
          onCopyCode={() => copyText(mermaidCode, 'Mermaid 代码已复制')}
          onCopyPrompt={handleCopyPrompt}
          onCopyMetadata={() => copyText(isReportSvg && reportConfig ? `图题：${reportConfig.caption}\n\n说明：本图为报告版 SVG 模板生成，适合插入 Word、PPT 或 Visio 后进行微调。${reportConfig.description ? `\n${reportConfig.description}` : ''}` : metadataText(metadata), '图题与说明已复制')}
          onDownloadSvg={handleDownloadSvg}
          onDownloadPng={handleDownloadPng}
          isPngExporting={isPngExporting}
          pngButtonLabel={pngButtonLabel}
          onDownloadPptx={handleDownloadPptx}
          onDownloadMermaid={handleDownloadMermaid}
          onResetExample={resetExample}
          feedback={feedback}
          onSvgReady={setCurrentSvg}
          reportSvg={reportSvg}
          isReportSvg={isReportSvg}
          exportSize={exportSize}
          setExportSize={setExportSize}
        />
      </main>
    </div>
  )
}

export default App
