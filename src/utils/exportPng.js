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
const EXPORT_TEXT_ERROR_MESSAGE = 'PNG 导出失败：未检测到可渲染的 SVG 文本，请尝试下载 SVG 或 PPTX 可编辑版'
const EXPORT_FONT_FAMILY = 'Arial, "Microsoft YaHei", "Noto Sans SC", sans-serif'
const DEFAULT_TEXT_FILL = '#1f2937'
const DEFAULT_FONT_SIZE = '14'

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

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function parseCoordinate(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value || ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function findInheritedAttribute(element, attributeName) {
  let current = element
  while (current) {
    if (current.getAttribute?.(attributeName)) return current.getAttribute(attributeName)
    current = current.parentElement
  }
  return ''
}

function getFontSize(element) {
  return element.getAttribute('font-size')
    || findInheritedAttribute(element.parentElement, 'font-size')
    || DEFAULT_FONT_SIZE
}

function getTextFill(element) {
  const fill = element.getAttribute('fill') || findInheritedAttribute(element.parentElement, 'fill')
  if (fill && fill !== 'none' && fill !== 'currentColor') return fill

  const color = element.getAttribute('color') || findInheritedAttribute(element.parentElement, 'color')
  if (color && color !== 'currentColor') return color

  return DEFAULT_TEXT_FILL
}

function inlineTextStyles(clonedSvg) {
  clonedSvg.querySelectorAll('text, tspan').forEach((textElement) => {
    textElement.setAttribute('font-family', EXPORT_FONT_FAMILY)
    textElement.setAttribute('fill', getTextFill(textElement))

    if (!textElement.getAttribute('font-size')) {
      textElement.setAttribute('font-size', getFontSize(textElement))
    }
  })
}

function extractForeignObjectLines(foreignObject) {
  const lines = []
  foreignObject.querySelectorAll('br').forEach((breakElement) => {
    breakElement.replaceWith(foreignObject.ownerDocument.createTextNode('\n'))
  })

  String(foreignObject.textContent || '')
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .forEach((line) => lines.push(line))

  if (!lines.length) {
    const text = normalizeWhitespace(foreignObject.textContent)
    if (text) lines.push(text)
  }

  return lines
}

function convertForeignObjectToText(foreignObject) {
  const lines = extractForeignObjectLines(foreignObject)
  if (!lines.length) return

  const document = foreignObject.ownerDocument
  const text = document.createElementNS(SVG_NAMESPACE, 'text')
  const x = parseCoordinate(foreignObject.getAttribute('x'))
  const y = parseCoordinate(foreignObject.getAttribute('y'))
  const width = parseCoordinate(foreignObject.getAttribute('width'))
  const height = parseCoordinate(foreignObject.getAttribute('height'))
  const fontSize = getFontSize(foreignObject)
  const lineHeight = Math.max(12, Number.parseFloat(fontSize) || Number.parseFloat(DEFAULT_FONT_SIZE) || 14) * 1.2
  const startY = y + (height ? (height - lineHeight * (lines.length - 1)) / 2 : 0)

  text.setAttribute('x', String(x + (width ? width / 2 : 0)))
  text.setAttribute('y', String(startY))
  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('dominant-baseline', 'middle')
  text.setAttribute('font-family', EXPORT_FONT_FAMILY)
  text.setAttribute('font-size', fontSize)
  text.setAttribute('fill', getTextFill(foreignObject))
  text.setAttribute('data-flowcraft-converted-foreign-object', 'true')

  lines.forEach((line, index) => {
    const tspan = document.createElementNS(SVG_NAMESPACE, 'tspan')
    tspan.setAttribute('x', text.getAttribute('x'))
    if (index > 0) tspan.setAttribute('dy', String(lineHeight))
    tspan.setAttribute('font-family', EXPORT_FONT_FAMILY)
    tspan.setAttribute('font-size', fontSize)
    tspan.setAttribute('fill', text.getAttribute('fill'))
    tspan.textContent = line
    text.appendChild(tspan)
  })

  foreignObject.replaceWith(text)
}

function ensureSvgTextForPng(clonedSvg) {
  const textNodes = Array.from(clonedSvg.querySelectorAll('text'))
  const foreignObjectNodes = Array.from(clonedSvg.querySelectorAll('foreignObject'))

  console.log('[FlowCraft] text nodes count', textNodes.length)
  console.log('[FlowCraft] foreignObject nodes count', foreignObjectNodes.length)

  if (textNodes.length === 0 && foreignObjectNodes.length > 0) {
    console.warn('当前 Mermaid 使用 HTML 标签渲染文字，正在尝试转换为 SVG text')
  }

  foreignObjectNodes.forEach(convertForeignObjectToText)
  inlineTextStyles(clonedSvg)

  if (clonedSvg.querySelectorAll('text').length === 0) {
    throw new Error(EXPORT_TEXT_ERROR_MESSAGE)
  }
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
  ensureSvgTextForPng(clonedSvg)
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
    if (error?.message === EXPORT_TEXT_ERROR_MESSAGE) {
      throw error
    }
    throw new Error(EXPORT_ERROR_MESSAGE)
  }
}
