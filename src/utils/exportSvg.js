import { fileNameFromTitle } from './fileName.js'
import { adaptSvgMarkupForExport, getSvgIntrinsicSize, parseSvgMarkup } from './svgExportAdapter.js'

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function assertSvgMarkup(svg) {
  if (!svg || !String(svg).includes('<svg')) {
    throw new Error('未检测到有效 SVG 内容')
  }
}

function getSvgExportDimensions(svg, options) {
  if (options.exportDimensions) return options.exportDimensions
  if (!options.targetWidth) return null

  const svgElement = parseSvgMarkup(svg)
  const size = getSvgIntrinsicSize(svgElement)
  const width = Number(options.targetWidth)
  if (!Number.isFinite(width) || width <= 0) return null
  return {
    width: Math.round(width),
    height: Math.round(width * size.height / size.width),
    fitCanvas: false,
    presetName: options.exportSize
  }
}

export function downloadSvg(svg, title = 'flowcraft-diagram', options = {}) {
  assertSvgMarkup(svg)
  const dimensions = getSvgExportDimensions(svg, options)
  const outputSvg = dimensions ? adaptSvgMarkupForExport(svg, dimensions) : svg
  const blob = new Blob([outputSvg], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, fileNameFromTitle(title, 'svg'))
}

export function downloadMermaidSource(code, title = 'flowcraft-diagram') {
  if (!String(code || '').trim()) throw new Error('未检测到 Mermaid 源码')
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, fileNameFromTitle(title, 'mmd'))
}
