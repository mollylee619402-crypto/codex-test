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

export function downloadSvg(svg, title = 'flowcraft-diagram') {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, fileNameFromTitle(title, 'svg'))
}

export function downloadMermaidSource(code, title = 'flowcraft-diagram') {
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' })
  downloadBlob(blob, fileNameFromTitle(title, 'mmd'))
}
