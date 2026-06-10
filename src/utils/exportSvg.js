import { fileNameFromTitle } from './fileName.js'

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

export function downloadSvg(svg, title = 'flowcraft-diagram') {
  assertSvgMarkup(svg)
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, fileNameFromTitle(title, 'svg'))
}

export function downloadMermaidSource(code, title = 'flowcraft-diagram') {
  if (!String(code || '').trim()) throw new Error('未检测到 Mermaid 源码')
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, fileNameFromTitle(title, 'mmd'))
}
