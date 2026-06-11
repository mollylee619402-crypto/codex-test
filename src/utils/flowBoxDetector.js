const DARK_THRESHOLD = 112
const MIN_BOX_SIZE = 28
const MAX_CANDIDATES = 60

function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('无法导出检测画布。'))), type)
  })
}

export async function loadImageToCanvas(file) {
  if (typeof document === 'undefined') throw new Error('流程框检测只能在浏览器中运行。')
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('无法读取图片。'))
      img.src = url
    })
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('当前浏览器不支持 Canvas。')
    context.drawImage(image, 0, 0, width, height)
    return { canvas, context, width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function isDarkPixel(data, index) {
  const alpha = data[index + 3]
  if (alpha <= 24) return false
  const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
  return gray < DARK_THRESHOLD
}

function projectionRuns(counts, minCount, minLength) {
  const runs = []
  let start = -1
  let peak = 0
  counts.forEach((count, index) => {
    if (count >= minCount) {
      if (start < 0) start = index
      peak = Math.max(peak, count)
    } else if (start >= 0) {
      if (index - start >= minLength) runs.push({ start, end: index - 1, center: Math.round((start + index - 1) / 2), peak })
      start = -1
      peak = 0
    }
  })
  if (start >= 0 && counts.length - start >= minLength) runs.push({ start, end: counts.length - 1, center: Math.round((start + counts.length - 1) / 2), peak })
  return runs
}

function lineCoverageHorizontal(dark, width, x1, x2, y, tolerance = 2) {
  let hits = 0
  const length = Math.max(1, x2 - x1 + 1)
  for (let x = x1; x <= x2; x += 1) {
    let found = false
    for (let dy = -tolerance; dy <= tolerance; dy += 1) {
      const yy = y + dy
      if (yy >= 0 && yy < Math.ceil(dark.length / width) && dark[yy * width + x]) { found = true; break }
    }
    if (found) hits += 1
  }
  return hits / length
}

function lineCoverageVertical(dark, width, height, x, y1, y2, tolerance = 2) {
  let hits = 0
  const length = Math.max(1, y2 - y1 + 1)
  for (let y = y1; y <= y2; y += 1) {
    let found = false
    for (let dx = -tolerance; dx <= tolerance; dx += 1) {
      const xx = x + dx
      if (xx >= 0 && xx < width && dark[y * width + xx]) { found = true; break }
    }
    if (found) hits += 1
  }
  return hits / length
}

function clampBox(box, width, height) {
  const x = Math.max(0, Math.min(width - 1, Math.round(box.x)))
  const y = Math.max(0, Math.min(height - 1, Math.round(box.y)))
  const right = Math.max(x + 1, Math.min(width, Math.round(box.x + box.width)))
  const bottom = Math.max(y + 1, Math.min(height, Math.round(box.y + box.height)))
  return { ...box, x, y, width: right - x, height: bottom - y }
}

function overlapRatio(a, b) {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const smaller = Math.min(a.width * a.height, b.width * b.height)
  return smaller ? intersection / smaller : 0
}

function mergeBoxes(boxes) {
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence)
  const kept = []
  sorted.forEach((box) => {
    const duplicate = kept.find((item) => overlapRatio(item, box) > 0.72)
    if (!duplicate) kept.push(box)
  })
  return kept
}

function classifyBox(box, imageWidth, imageHeight) {
  const areaRatio = (box.width * box.height) / Math.max(1, imageWidth * imageHeight)
  if (areaRatio > 0.18 || box.width > imageWidth * 0.72 || box.height > imageHeight * 0.46) return 'group'
  if (box.y < imageHeight * 0.16 && box.height < imageHeight * 0.12 && box.width > imageWidth * 0.25) return 'caption'
  return 'node'
}

export async function cropImageRegion(file, region, options = {}) {
  const { canvas, width, height } = await loadImageToCanvas(file)
  const padding = options.padding ?? 8
  const scale = options.scale ?? 1
  const crop = clampBox({
    x: region.x - padding,
    y: region.y - padding,
    width: region.width + padding * 2,
    height: region.height + padding * 2
  }, width, height)
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(crop.width * scale))
  out.height = Math.max(1, Math.round(crop.height * scale))
  const context = out.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('当前浏览器不支持 Canvas。')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, out.width, out.height)

  if (options.grayscale || options.enhanceContrast || options.binarize !== false) {
    const imageData = context.getImageData(0, 0, out.width, out.height)
    const data = imageData.data
    const contrastFactor = options.enhanceContrast ? 1.42 : 1
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      if (options.binarize !== false) {
        const value = gray < 172 ? 0 : 255
        data[i] = value
        data[i + 1] = value
        data[i + 2] = value
      } else {
        const enhanced = Math.max(0, Math.min(255, (gray - 128) * contrastFactor + 128))
        if (options.grayscale) {
          data[i] = enhanced
          data[i + 1] = enhanced
          data[i + 2] = enhanced
        } else {
          data[i] = Math.max(0, Math.min(255, (data[i] - 128) * contrastFactor + 128))
          data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * contrastFactor + 128))
          data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * contrastFactor + 128))
        }
      }
    }
    context.putImageData(imageData, 0, 0)
  }

  const blob = await canvasToBlob(out)
  return new File([blob], `flowcraft-region-${Date.now()}.png`, { type: 'image/png', lastModified: Date.now() })
}

export async function detectFlowBoxes(file, options = {}) {
  const loaded = await loadImageToCanvas(file)
  const { context, width, height } = loaded
  const imageData = context.getImageData(0, 0, width, height)
  const { data } = imageData
  const dark = new Uint8Array(width * height)
  const rowCounts = new Array(height).fill(0)
  const colCounts = new Array(width).fill(0)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      if (isDarkPixel(data, index)) {
        dark[y * width + x] = 1
        rowCounts[y] += 1
        colCounts[x] += 1
      }
    }
  }

  const minHorizontal = Math.max(24, Math.round(width * 0.035))
  const minVertical = Math.max(18, Math.round(height * 0.025))
  const limitRuns = (runs, maxRuns) => runs.length <= maxRuns ? runs : [...runs].sort((a, b) => b.peak - a.peak).slice(0, maxRuns).sort((a, b) => a.center - b.center)
  const horizontalLines = limitRuns(projectionRuns(rowCounts, minHorizontal, 1), 80)
  const verticalLines = limitRuns(projectionRuns(colCounts, minVertical, 1), 80)
  const candidates = []

  for (let topIndex = 0; topIndex < horizontalLines.length; topIndex += 1) {
    for (let bottomIndex = topIndex + 1; bottomIndex < horizontalLines.length; bottomIndex += 1) {
      const top = horizontalLines[topIndex].center
      const bottom = horizontalLines[bottomIndex].center
      const boxHeight = bottom - top
      if (boxHeight < MIN_BOX_SIZE || boxHeight > height * 0.72) continue
      for (let leftIndex = 0; leftIndex < verticalLines.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < verticalLines.length; rightIndex += 1) {
          const left = verticalLines[leftIndex].center
          const right = verticalLines[rightIndex].center
          const boxWidth = right - left
          if (boxWidth < MIN_BOX_SIZE || boxWidth > width * 0.86) continue
          const areaRatio = (boxWidth * boxHeight) / Math.max(1, width * height)
          if (areaRatio > 0.78) continue
          const topCoverage = lineCoverageHorizontal(dark, width, left, right, top)
          const bottomCoverage = lineCoverageHorizontal(dark, width, left, right, bottom)
          const leftCoverage = lineCoverageVertical(dark, width, height, left, top, bottom)
          const rightCoverage = lineCoverageVertical(dark, width, height, right, top, bottom)
          const confidence = (topCoverage + bottomCoverage + leftCoverage + rightCoverage) / 4
          if (confidence < (options.minConfidence ?? 0.48)) continue
          const box = clampBox({ x: left, y: top, width: boxWidth, height: boxHeight, confidence }, width, height)
          candidates.push({ ...box, type: classifyBox(box, width, height) })
        }
      }
    }
  }

  const merged = mergeBoxes(candidates)
    .filter((box) => box.width >= MIN_BOX_SIZE && box.height >= MIN_BOX_SIZE)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x))
    .slice(0, options.maxCandidates || MAX_CANDIDATES)

  return { boxes: merged, imageWidth: width, imageHeight: height }
}
