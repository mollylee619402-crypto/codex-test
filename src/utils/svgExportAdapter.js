const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 800

function parseLength(value) {
  if (!value || String(value).trim().endsWith('%')) return 0
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function parseViewBox(value) {
  const parts = String(value || '').trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null
  const [x, y, width, height] = parts
  return width > 0 && height > 0 ? { x, y, width, height } : null
}

export function getSvgIntrinsicSize(svgElement, fallback = {}) {
  const viewBox = parseViewBox(svgElement?.getAttribute?.('viewBox'))
  const width = parseLength(svgElement?.getAttribute?.('width'))
    || viewBox?.width
    || fallback.width
    || DEFAULT_WIDTH
  const height = parseLength(svgElement?.getAttribute?.('height'))
    || viewBox?.height
    || fallback.height
    || DEFAULT_HEIGHT

  return {
    width: Math.ceil(width),
    height: Math.ceil(height),
    viewBox: viewBox || { x: 0, y: 0, width: Math.ceil(width), height: Math.ceil(height) }
  }
}

export function parseSvgMarkup(svg) {
  if (!svg) throw new Error('SVG is empty')
  if (typeof SVGElement !== 'undefined' && svg instanceof SVGElement) return svg.cloneNode(true)
  if (typeof svg !== 'string') throw new Error('Unsupported SVG input')

  const documentFragment = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const parseError = documentFragment.querySelector('parsererror')
  if (parseError) throw new Error('Invalid SVG markup')

  const svgElement = documentFragment.querySelector('svg')
  if (!svgElement) throw new Error('No SVG element found')
  return svgElement.cloneNode(true)
}

function moveChildrenIntoScaledGroup(svgElement, dimensions, sourceSize) {
  const doc = svgElement.ownerDocument
  const children = Array.from(svgElement.childNodes)
  const group = doc.createElementNS(SVG_NAMESPACE, 'g')
  const scale = Math.min(dimensions.width / sourceSize.viewBox.width, dimensions.height / sourceSize.viewBox.height)
  const fittedWidth = sourceSize.viewBox.width * scale
  const fittedHeight = sourceSize.viewBox.height * scale
  const offsetX = (dimensions.width - fittedWidth) / 2
  const offsetY = (dimensions.height - fittedHeight) / 2

  group.setAttribute('transform', `translate(${offsetX} ${offsetY}) scale(${scale}) translate(${-sourceSize.viewBox.x} ${-sourceSize.viewBox.y})`)
  children.forEach((child) => group.appendChild(child))
  svgElement.appendChild(group)
}

export function adaptSvgElementForExport(svgElement, dimensions) {
  if (!dimensions?.width || !dimensions?.height) return svgElement

  const sourceSize = getSvgIntrinsicSize(svgElement, dimensions)
  svgElement.setAttribute('xmlns', SVG_NAMESPACE)
  svgElement.setAttribute('width', String(dimensions.width))
  svgElement.setAttribute('height', String(dimensions.height))

  if (dimensions.fitCanvas) {
    moveChildrenIntoScaledGroup(svgElement, dimensions, sourceSize)
    svgElement.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
  } else {
    svgElement.setAttribute('viewBox', `${sourceSize.viewBox.x} ${sourceSize.viewBox.y} ${sourceSize.viewBox.width} ${sourceSize.viewBox.height}`)
  }

  return svgElement
}

export function adaptSvgMarkupForExport(svg, dimensions) {
  const svgElement = adaptSvgElementForExport(parseSvgMarkup(svg), dimensions)
  return new XMLSerializer().serializeToString(svgElement)
}
