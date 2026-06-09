import { fileNameFromTitle } from './fileName.js'
import { downloadBlob } from './exportSvg.js'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
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

  if (typeof SVGElement !== 'undefined' && svg instanceof SVGElement) return svg

  if (typeof svg === 'string') {
    const documentFragment = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const parseError = documentFragment.querySelector('parsererror')
    if (parseError) throw new Error('Invalid SVG markup')

    const svgElement = documentFragment.querySelector('svg')
    if (!svgElement) throw new Error('No SVG element found')
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
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  }

  const { width, height } = getSvgSize(sourceSvg, clonedSvg)
  clonedSvg.setAttribute('width', String(width))
  clonedSvg.setAttribute('height', String(height))

  if (!clonedSvg.getAttribute('viewBox')) {
    clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }

  return {
    width,
    height,
    markup: new XMLSerializer().serializeToString(clonedSvg)
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('SVG image load failed'))
    image.src = url
  })
}

function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/png'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mimeType })
}

function canvasToPngBlob(canvas) {
  if (!canvas.toBlob) return Promise.resolve(dataUrlToBlob(canvas.toDataURL('image/png', 1)))

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob returned null'))
    }, 'image/png', 1)
  })
}

export async function downloadPng(svg, title = 'flowcraft-diagram', scale = DEFAULT_SCALE) {
  const exportScale = Math.max(1, Number(scale) || DEFAULT_SCALE)
  const { width, height, markup } = prepareSvgForExport(svg)
  const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width * exportScale)
    canvas.height = Math.ceil(height * exportScale)

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context is unavailable')

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const pngBlob = await canvasToPngBlob(canvas)
    downloadBlob(pngBlob, fileNameFromTitle(title, 'png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
