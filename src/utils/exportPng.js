import { fileNameFromTitle } from './fileName.js'
import { downloadBlob } from './exportSvg.js'

export async function downloadPng(svg, title = 'flowcraft-diagram', scale = 3) {
  if (!svg) throw new Error('SVG is empty')

  const image = new Image()
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = url
    })

    const width = image.naturalWidth || 1200
    const height = image.naturalHeight || 800
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width * scale)
    canvas.height = Math.ceil(height * scale)
    const context = canvas.getContext('2d')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1))
    if (!pngBlob) throw new Error('PNG export failed')
    downloadBlob(pngBlob, fileNameFromTitle(title, 'png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
