import { Canvg } from 'canvg'
import { fileNameFromTitle } from './fileName.js'
import { downloadBlob } from './exportSvg.js'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'
const PNG_MIME_TYPE = 'image/png'
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 800
const DEFAULT_SCALE = 3
const EXPORT_ERROR_MESSAGE = '当前图形包含浏览器无法栅格化的内容。建议下载 SVG 或 PPTX 可编辑版。'

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

function removeExternalImages(clonedSvg) {
  clonedSvg.querySelectorAll('image').forEach((image) => {
    const href = image.getAttribute('href')
      || image.getAttribute('xlink:href')
      || image.getAttributeNS(XLINK_NAMESPACE, 'href')

    if (/^https?:\/\//i.test(String(href || '').trim())) {
      image.remove()
    }
  })
}

function sanitizeStyleText(styleText) {
  return String(styleText || '')
    .replace(/@import\s+(?:url\()?['"]?https?:\/\/[^;]+;?/gi, '')
    .replace(/@font-face\s*{[^}]*url\(\s*['"]?https?:\/\/[^}]*}/gi, '')
}

function sanitizeSvgForPng(clonedSvg) {
  removeExternalImages(clonedSvg)

  clonedSvg.querySelectorAll('style').forEach((styleElement) => {
    styleElement.textContent = sanitizeStyleText(styleElement.textContent)
  })

  clonedSvg.querySelectorAll('link[href^="http"], link[href^="//"]').forEach((linkElement) => {
    linkElement.remove()
  })

  console.log('SVG sanitized')
}

function ensureLightBackground(clonedSvg, width, height) {
  const background = clonedSvg.ownerDocument.createElementNS(SVG_NAMESPACE, 'rect')
  background.setAttribute('x', '0')
  background.setAttribute('y', '0')
  background.setAttribute('width', String(width))
  background.setAttribute('height', String(height))
  background.setAttribute('fill', '#ffffff')
  background.setAttribute('data-flowcraft-export-background', 'true')
  clonedSvg.insertBefore(background, clonedSvg.firstChild)
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

  sanitizeSvgForPng(clonedSvg)
  ensureLightBackground(clonedSvg, width, height)

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
  context.scale(scale, scale)

  return { canvas, context }
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(EXPORT_ERROR_MESSAGE))
        return
      }

      resolve(blob)
    }, PNG_MIME_TYPE)
  })
}

function assertPngBlob(blob) {
  console.log('png blob created')
  console.log('png blob type', blob?.type)

  if (!(blob instanceof Blob)) {
    throw new Error(EXPORT_ERROR_MESSAGE)
  }

  if (blob.type !== PNG_MIME_TYPE) {
    throw new Error(`PNG export created an invalid MIME type: ${blob.type || 'empty'}`)
  }
}

function pngFileName(title) {
  const fileName = fileNameFromTitle(title, 'png')
  return fileName.toLowerCase().endsWith('.png') ? fileName : `${fileName}.png`
}

async function renderSvgToCanvas(markup, context) {
  console.log('canvg render started')
  const renderer = await Canvg.from(context, markup, {
    ignoreAnimation: true,
    ignoreMouse: true
  })
  await renderer.render()
  console.log('canvg render completed')
}

export async function downloadPng(svg, title = 'flowcraft-diagram', scale = DEFAULT_SCALE) {
  const exportScale = Math.max(1, Number(scale) || DEFAULT_SCALE)

  try {
    const { width, height, markup } = prepareSvgForExport(svg)
    const { canvas, context } = createExportCanvas(width, height, exportScale)

    await renderSvgToCanvas(markup, context)

    const pngBlob = await canvasToPngBlob(canvas)
    assertPngBlob(pngBlob)

    downloadBlob(pngBlob, pngFileName(title))
    console.log('png download triggered')
  } catch (error) {
    console.error('PNG export failed in canvg pipeline', error)
    throw new Error(EXPORT_ERROR_MESSAGE)
  }
}
