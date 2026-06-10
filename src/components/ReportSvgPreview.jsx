import { useEffect, useRef, useState } from 'react'

const ZOOM_STEPS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2]

function ReportSvgPreview({ svg, onSvgReady }) {
  const containerRef = useRef(null)
  const [zoom, setZoom] = useState('fit')

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = svg || ''
    }
    onSvgReady(svg || '')
  }, [svg, onSvgReady])

  const numericZoom = zoom === 'fit' ? 1 : zoom
  const zoomIn = () => {
    const current = zoom === 'fit' ? 1 : zoom
    setZoom(ZOOM_STEPS.find((step) => step > current) || ZOOM_STEPS.at(-1))
  }
  const zoomOut = () => {
    const current = zoom === 'fit' ? 1 : zoom
    setZoom([...ZOOM_STEPS].reverse().find((step) => step < current) || ZOOM_STEPS[0])
  }

  return (
    <div className="report-preview-wrapper">
      <div className="preview-controls" aria-label="报告版 SVG 缩放控制">
        <button type="button" onClick={() => setZoom('fit')}>适应宽度</button>
        <button type="button" onClick={() => setZoom(1)}>100%</button>
        <button type="button" onClick={zoomOut}>缩小</button>
        <button type="button" onClick={zoomIn}>放大</button>
      </div>
      <div className="preview-shell report-preview-shell">
        <div
          className={`report-svg-preview ${zoom === 'fit' ? 'is-fit' : ''}`}
          style={zoom === 'fit' ? undefined : { '--report-preview-zoom': numericZoom }}
          ref={containerRef}
          aria-label="报告版 SVG 预览"
        />
      </div>
    </div>
  )
}

export default ReportSvgPreview
