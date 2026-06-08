import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import InputPanel from './components/InputPanel'
import OutputPanel from './components/OutputPanel'
import { DEFAULT_EXAMPLE, DIAGRAM_TYPES } from './data/examples'
import { buildFlowSummary, parseFlowDescription } from './utils/flowParser'
import { generateMermaid } from './utils/mermaidGenerator'
import { generatePrompt } from './utils/promptGenerator'

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
  const [templates, setTemplates] = useState([])
  const [feedback, setFeedback] = useState('')
  const [currentSvg, setCurrentSvg] = useState('')
  const feedbackTimerRef = useRef(null)

  const diagramTypeLabel = useMemo(
    () => DIAGRAM_TYPES.find((type) => type.value === diagramType)?.label || '基础版流程图',
    [diagramType]
  )

  const config = useMemo(() => ({ diagramType, diagramTypeLabel, outputPurpose, style }), [diagramType, diagramTypeLabel, outputPurpose, style])

  const showFeedback = useCallback((message) => {
    setFeedback(message)
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(''), 1800)
  }, [])

  const generate = useCallback((source = input, nextConfig = config) => {
    const nodes = parseFlowDescription(source)
    setMermaidCode(generateMermaid(nodes, nextConfig))
    setSummary(buildFlowSummary(nodes, nextConfig))
  }, [input, config])

  useEffect(() => {
    setTemplates(readTemplates())
    const initialConfig = {
      diagramType: DEFAULT_EXAMPLE.diagramType,
      diagramTypeLabel: DIAGRAM_TYPES.find((type) => type.value === DEFAULT_EXAMPLE.diagramType)?.label || '美化版流程图',
      outputPurpose: DEFAULT_EXAMPLE.outputPurpose,
      style: DEFAULT_EXAMPLE.style
    }
    const nodes = parseFlowDescription(DEFAULT_EXAMPLE.content)
    setMermaidCode(generateMermaid(nodes, initialConfig))
    setSummary(buildFlowSummary(nodes, initialConfig))

    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const saveTemplates = (nextTemplates) => {
    setTemplates(nextTemplates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTemplates))
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

  const handleDownloadSvg = () => {
    if (!currentSvg) {
      showFeedback('当前没有可下载的 SVG')
      return
    }
    const blob = new Blob([currentSvg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'flowcraft-diagram.svg'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    showFeedback('SVG 已下载')
  }

  const resetExample = () => {
    setInput(DEFAULT_EXAMPLE.content)
    setDiagramType(DEFAULT_EXAMPLE.diagramType)
    setOutputPurpose(DEFAULT_EXAMPLE.outputPurpose)
    setStyle(DEFAULT_EXAMPLE.style)
    generate(DEFAULT_EXAMPLE.content, {
      diagramType: DEFAULT_EXAMPLE.diagramType,
      diagramTypeLabel: '美化版流程图',
      outputPurpose: DEFAULT_EXAMPLE.outputPurpose,
      style: DEFAULT_EXAMPLE.style
    })
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
          templates={templates}
          onLoadTemplate={handleLoadTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
        <OutputPanel
          mermaidCode={mermaidCode}
          setMermaidCode={setMermaidCode}
          summary={summary}
          onCopyCode={() => copyText(mermaidCode, 'Mermaid 代码已复制')}
          onCopyPrompt={handleCopyPrompt}
          onDownloadSvg={handleDownloadSvg}
          onResetExample={resetExample}
          feedback={feedback}
          onSvgReady={setCurrentSvg}
        />
      </main>
    </div>
  )
}

export default App
