const SVG_NS = 'http://www.w3.org/2000/svg'

function parseNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value || ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function parsePoints(value) {
  const numbers = String(value || '').trim().split(/[\s,]+/).map(Number).filter(Number.isFinite)
  const points = []
  for (let index = 0; index < numbers.length; index += 2) {
    points.push([numbers[index], numbers[index + 1]])
  }
  return points
}

function parseStyleAttribute(value) {
  return String(value || '').split(';').reduce((styles, declaration) => {
    const [property, ...parts] = declaration.split(':')
    if (property && parts.length) styles[property.trim()] = parts.join(':').trim()
    return styles
  }, {})
}

function parseCssRules(svg) {
  const rules = []
  svg.querySelectorAll('style').forEach((styleElement) => {
    const css = styleElement.textContent || ''
    const ruleRegex = /([^{}]+){([^{}]+)}/g
    let match = ruleRegex.exec(css)
    while (match) {
      const selectors = match[1].split(',').map((selector) => selector.trim())
      const declarations = parseStyleAttribute(match[2])
      selectors.forEach((selector) => {
        if (selector.startsWith('.')) rules.push({ className: selector.slice(1), declarations })
      })
      match = ruleRegex.exec(css)
    }
  })
  return rules
}

function nodeStyles(node, rules) {
  const styles = {}
  const classList = String(node.getAttribute('class') || '').split(/\s+/).filter(Boolean)
  rules.forEach((rule) => {
    if (classList.includes(rule.className)) Object.assign(styles, rule.declarations)
  })
  Object.assign(styles, parseStyleAttribute(node.getAttribute('style')))
  return styles
}

function readPaint(node, rules, name, fallback) {
  const styles = nodeStyles(node, rules)
  const value = node.getAttribute(name) || styles[name] || fallback
  return value === 'none' ? null : value
}

function applyContext(ctx, node, rules) {
  const styles = nodeStyles(node, rules)
  const fill = readPaint(node, rules, 'fill', '#111827')
  const stroke = readPaint(node, rules, 'stroke', null)
  const strokeWidth = parseNumber(node.getAttribute('stroke-width') || styles['stroke-width'], 1)
  const opacity = parseNumber(node.getAttribute('opacity') || styles.opacity, 1)
  ctx.globalAlpha *= opacity
  if (fill) ctx.fillStyle = fill
  if (stroke) ctx.strokeStyle = stroke
  ctx.lineWidth = strokeWidth
  ctx.lineCap = node.getAttribute('stroke-linecap') || styles['stroke-linecap'] || 'butt'
  ctx.lineJoin = node.getAttribute('stroke-linejoin') || styles['stroke-linejoin'] || 'miter'
  const fontSize = node.getAttribute('font-size') || styles['font-size'] || '16px'
  const fontFamily = node.getAttribute('font-family') || styles['font-family'] || 'sans-serif'
  const fontWeight = node.getAttribute('font-weight') || styles['font-weight'] || 'normal'
  ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`
  ctx.textAlign = node.getAttribute('text-anchor') === 'middle' ? 'center' : node.getAttribute('text-anchor') === 'end' ? 'right' : 'left'
  ctx.textBaseline = 'middle'
  return { fill, stroke }
}

function applyTransform(ctx, transform) {
  String(transform || '').replace(/(matrix|translate|scale|rotate)\(([^)]*)\)/g, (_, type, rawArgs) => {
    const args = rawArgs.split(/[\s,]+/).map(Number).filter(Number.isFinite)
    if (type === 'matrix' && args.length === 6) ctx.transform(...args)
    if (type === 'translate') ctx.translate(args[0] || 0, args[1] || 0)
    if (type === 'scale') ctx.scale(args[0] || 1, args.length > 1 ? args[1] : args[0] || 1)
    if (type === 'rotate') {
      const angle = (args[0] || 0) * Math.PI / 180
      if (args.length > 2) {
        ctx.translate(args[1], args[2])
        ctx.rotate(angle)
        ctx.translate(-args[1], -args[2])
      } else {
        ctx.rotate(angle)
      }
    }
    return ''
  })
}

function drawPathData(ctx, d) {
  const tokens = String(d || '').match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g) || []
  let index = 0
  let command = ''
  let currentX = 0
  let currentY = 0
  let startX = 0
  let startY = 0
  const next = () => Number(tokens[index++])
  const isCommand = (token) => /^[a-zA-Z]$/.test(token)
  while (index < tokens.length) {
    if (isCommand(tokens[index])) command = tokens[index++]
    const relative = command === command.toLowerCase()
    const c = command.toUpperCase()
    const x = (value) => relative ? currentX + value : value
    const y = (value) => relative ? currentY + value : value
    if (c === 'M') {
      currentX = x(next()); currentY = y(next()); ctx.moveTo(currentX, currentY); startX = currentX; startY = currentY; command = relative ? 'l' : 'L'
    } else if (c === 'L') {
      currentX = x(next()); currentY = y(next()); ctx.lineTo(currentX, currentY)
    } else if (c === 'H') {
      currentX = x(next()); ctx.lineTo(currentX, currentY)
    } else if (c === 'V') {
      currentY = y(next()); ctx.lineTo(currentX, currentY)
    } else if (c === 'C') {
      const x1 = x(next()); const y1 = y(next()); const x2 = x(next()); const y2 = y(next()); currentX = x(next()); currentY = y(next()); ctx.bezierCurveTo(x1, y1, x2, y2, currentX, currentY)
    } else if (c === 'Q') {
      const x1 = x(next()); const y1 = y(next()); currentX = x(next()); currentY = y(next()); ctx.quadraticCurveTo(x1, y1, currentX, currentY)
    } else if (c === 'Z') {
      ctx.closePath(); currentX = startX; currentY = startY
    } else {
      index += 1
    }
  }
}

function strokeAndFill(ctx, node, rules) {
  const { fill, stroke } = applyContext(ctx, node, rules)
  if (fill) ctx.fill()
  if (stroke) ctx.stroke()
}

function renderNode(ctx, node, rules) {
  if (node.nodeType !== 1) return
  const tag = node.localName
  if (['defs', 'style', 'title', 'desc'].includes(tag)) return

  ctx.save()
  applyTransform(ctx, node.getAttribute('transform'))

  if (tag === 'svg' || tag === 'g' || tag === 'a') {
    node.childNodes.forEach((child) => renderNode(ctx, child, rules))
  } else if (tag === 'rect') {
    applyContext(ctx, node, rules)
    const x = parseNumber(node.getAttribute('x'))
    const y = parseNumber(node.getAttribute('y'))
    const width = parseNumber(node.getAttribute('width'))
    const height = parseNumber(node.getAttribute('height'))
    const rx = parseNumber(node.getAttribute('rx'))
    ctx.beginPath()
    if (rx && ctx.roundRect) ctx.roundRect(x, y, width, height, rx)
    else ctx.rect(x, y, width, height)
    strokeAndFill(ctx, node, rules)
  } else if (tag === 'circle' || tag === 'ellipse') {
    applyContext(ctx, node, rules)
    const cx = parseNumber(node.getAttribute('cx'))
    const cy = parseNumber(node.getAttribute('cy'))
    const rx = tag === 'circle' ? parseNumber(node.getAttribute('r')) : parseNumber(node.getAttribute('rx'))
    const ry = tag === 'circle' ? rx : parseNumber(node.getAttribute('ry'))
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); strokeAndFill(ctx, node, rules)
  } else if (tag === 'line') {
    applyContext(ctx, node, rules)
    ctx.beginPath(); ctx.moveTo(parseNumber(node.getAttribute('x1')), parseNumber(node.getAttribute('y1'))); ctx.lineTo(parseNumber(node.getAttribute('x2')), parseNumber(node.getAttribute('y2'))); ctx.stroke()
  } else if (tag === 'polyline' || tag === 'polygon') {
    applyContext(ctx, node, rules)
    const points = parsePoints(node.getAttribute('points'))
    ctx.beginPath(); points.forEach(([x, y], pointIndex) => pointIndex ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (tag === 'polygon') ctx.closePath(); strokeAndFill(ctx, node, rules)
  } else if (tag === 'path') {
    applyContext(ctx, node, rules)
    ctx.beginPath(); drawPathData(ctx, node.getAttribute('d')); strokeAndFill(ctx, node, rules)
  } else if (tag === 'text' || tag === 'tspan') {
    const { fill, stroke } = applyContext(ctx, node, rules)
    const x = parseNumber(node.getAttribute('x'), undefined)
    const y = parseNumber(node.getAttribute('y'), undefined)
    const dx = parseNumber(node.getAttribute('dx'))
    const dy = parseNumber(node.getAttribute('dy'))
    const text = node.textContent || ''
    if (fill) ctx.fillText(text, (Number.isFinite(x) ? x : 0) + dx, (Number.isFinite(y) ? y : 0) + dy)
    if (stroke) ctx.strokeText(text, (Number.isFinite(x) ? x : 0) + dx, (Number.isFinite(y) ? y : 0) + dy)
  } else {
    node.childNodes.forEach((child) => renderNode(ctx, child, rules))
  }

  ctx.restore()
}

export class Canvg {
  static async from(ctx, svg) {
    return new Canvg(ctx, svg)
  }

  constructor(ctx, svg) {
    this.ctx = ctx
    this.document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    this.svg = this.document.querySelector('svg') || this.document.createElementNS(SVG_NS, 'svg')
    this.rules = parseCssRules(this.svg)
  }

  async render() {
    renderNode(this.ctx, this.svg, this.rules)
  }
}
