import { fileNameFromTitle } from './fileName.js'
import { downloadBlob } from './exportSvg.js'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
const PNG_MIME_TYPE = 'image/png'
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 800
const DEFAULT_SCALE = 3

function parseLength(value) {
  if (!value || String(value).trim().endsWith('%')) return 0
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function getSvgElement(svg) {
  if (!svg) throw new Error('SVG is empty')

  if (typeof SVGElement !== 'undefined' && svg instanceof SVGElement) {
    console.log('SVG found')
    return svg
  }

  if (typeof svg === 'string') {
    const documentFragment = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const parseError = documentFragment.querySelector('parsererror')
    if (parseError) throw new Error('Invalid SVG markup')

    const svgElement = documentFragment.querySelector('svg')
    if (!svgElement) throw new Error('No SVG element found')
    console.log('SVG found')
    return svgElement
  }

  throw new Error('Unsupported SVG input')
}

function parseViewBox(value) {
  const parts = String(value || '').trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null
  const [, , width, height] = parts
  return width > 0 && height > 0 ? { width, height } : null
}

function getSvgSize(sourceSvg, clonedSvg) {
  const sourceRect = typeof sourceSvg.getBoundingClientRect === 'function'
    ? sourceSvg.getBoundingClientRect()
    : null
  const viewBox = clonedSvg.viewBox?.baseVal || parseViewBox(clonedSvg.getAttribute('viewBox'))

  const width = parseLength(clonedSvg.getAttribute('width'))
    || sourceRect?.width
    || viewBox?.width
    || DEFAULT_WIDTH
  const height = parseLength(clonedSvg.getAttribute('height'))
    || sourceRect?.height
    || viewBox?.height
    || DEFAULT_HEIGHT

  return {
    width: Math.ceil(width),
    height: Math.ceil(height)
  }
}

function prepareSvgForExport(svg) {
  const sourceSvg = getSvgElement(svg)
  const clonedSvg = sourceSvg.cloneNode(true)

  clonedSvg.setAttribute('xmlns', SVG_NAMESPACE)
  if (!clonedSvg.getAttribute('xmlns:xlink')) {
    clonedSvg.setAttribute('xmlns:xlink', XLINK_NAMESPACE)
  }

  const { width, height } = getSvgSize(sourceSvg, clonedSvg)
  clonedSvg.setAttribute('width', String(width))
  clonedSvg.setAttribute('height', String(height))

  if (!clonedSvg.getAttribute('viewBox')) {
    clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }

  const markup = new XMLSerializer().serializeToString(clonedSvg)
  console.log('SVG serialized')

  return {
    width,
    height,
    markup
  }
}

function createExportCanvas(width, height, scale) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D context is unavailable')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  return { canvas, context }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const timeout = window.setTimeout(() => {
      image.onload = null
      image.onerror = null
      reject(new Error('SVG image load timed out'))
    }, 8000)

    image.onload = () => {
      window.clearTimeout(timeout)
      console.log('image loaded')
      resolve(image)
    }
    image.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error('SVG image load failed'))
    }
    image.src = url
  })
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mimeType = header.match(/data:(.*?);/)?.[1] || PNG_MIME_TYPE
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mimeType })
}

function canvasDataUrlToPngBlob(canvas) {
  return dataUrlToBlob(canvas.toDataURL(PNG_MIME_TYPE, 1))
}

function canvasToPngBlob(canvas) {
  if (!canvas.toBlob) return Promise.resolve(canvasDataUrlToPngBlob(canvas))

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob || canvasDataUrlToPngBlob(canvas))
    }, PNG_MIME_TYPE, 1)
  })
}

function assertPngBlob(blob) {
  console.log('png blob created')
  console.log('png blob type', blob?.type)

  if (!(blob instanceof Blob)) {
    throw new Error('PNG export did not create a Blob')
  }

  if (blob.type !== PNG_MIME_TYPE) {
    throw new Error(`PNG export created an invalid MIME type: ${blob.type || 'empty'}`)
  }
}

function pngFileName(title) {
  const fileName = fileNameFromTitle(title, 'png')
  return fileName.toLowerCase().endsWith('.png') ? fileName : `${fileName}.png`
}

export async function downloadPng(svg, title = 'flowcraft-diagram', scale = DEFAULT_SCALE) {
  const exportScale = Math.max(1, Number(scale) || DEFAULT_SCALE)
  const { width, height, markup } = prepareSvgForExport(svg)
  const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(url)
    const { canvas, context } = createExportCanvas(width, height, exportScale)

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    console.log('canvas drawn')

    const pngBlob = await canvasToPngBlob(canvas)
    assertPngBlob(pngBlob)

    downloadBlob(pngBlob, pngFileName(title))
    console.log('png download triggered')
  } finally {
    URL.revokeObjectURL(url)
  }
}
