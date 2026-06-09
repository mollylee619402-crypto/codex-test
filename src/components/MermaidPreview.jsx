import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: false,
    useMaxWidth: false
  },
  theme: 'base',
  themeVariables: {
    fontFamily: 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
    primaryColor: '#e0f2fe',
    primaryBorderColor: '#0284c7',
    lineColor: '#64748b'
  }
})

function MermaidPreview({ code, onSvgReady }) {
  const containerRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const renderChart = async () => {
      if (!code.trim()) {
        setError('')
        if (containerRef.current) containerRef.current.innerHTML = ''
        onSvgReady('')
        return
      }

      try {
        const renderId = `flowcraft-${Date.now()}-${Math.random().toString(16).slice(2)}`
        const { svg } = await mermaid.render(renderId, code)
        if (!mounted) return
        setError('')
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          const renderedSvg = containerRef.current.querySelector('svg')
          onSvgReady(renderedSvg ? new XMLSerializer().serializeToString(renderedSvg) : svg)
        } else {
          onSvgReady(svg)
        }
      } catch (renderError) {
        if (!mounted) return
        setError('Mermaid 渲染失败，请检查节点名称或连接关系。代码已保留，可手动调整。')
        onSvgReady('')
      }
    }

    renderChart()
    return () => {
      mounted = false
    }
  }, [code, onSvgReady])

  return (
    <div className="preview-shell">
      {error && <div className="error-box">{error}</div>}
      <div className="mermaid-preview" ref={containerRef} aria-label="流程图实时预览" />
    </div>
  )
}

export default MermaidPreview
