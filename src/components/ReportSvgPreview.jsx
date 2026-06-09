import { useEffect, useRef } from 'react'

function ReportSvgPreview({ svg, onSvgReady }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = svg || ''
    }
    onSvgReady(svg || '')
  }, [svg, onSvgReady])

  return (
    <div className="preview-shell report-preview-shell">
      <div
        className="report-svg-preview"
        ref={containerRef}
        aria-label="报告版 SVG 预览"
      />
    </div>
  )
}

export default ReportSvgPreview
