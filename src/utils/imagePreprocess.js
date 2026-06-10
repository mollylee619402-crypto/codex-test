const MAX_OCR_DIMENSION = 3600
const MAX_OCR_PIXELS = 14000000
const DEFAULT_CROP_PADDING = 20

function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('图片预处理失败：无法导出 Canvas。'))
    }, type)
  })
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close?.() }
    } catch {
      // Fall back to HTMLImageElement below for browsers with partial createImageBitmap support.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('图片预处理失败：无法读取图片。'))
      img.src = url
    })
    return { source: image, width: image.naturalWidth || image.width, height: image.naturalHeight || image.height, close: () => URL.revokeObjectURL(url) }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

function drawToCanvas(source, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('图片预处理失败：当前浏览器不支持 Canvas。')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return { canvas, context }
}

function isNearWhite(r, g, b, alpha) {
  if (alpha <= 12) return true
  const spread = Math.max(r, g, b) - Math.min(r, g, b)
  return r >= 244 && g >= 244 && b >= 244 && spread <= 18
}

function findContentBounds(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height)
  const { data } = imageData
  const step = Math.max(1, Math.floor(Math.max(width, height) / 1200))
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let contentPixels = 0
  let sampledPixels = 0

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4
      sampledPixels += 1
      if (!isNearWhite(data[index], data[index + 1], data[index + 2], data[index + 3])) {
        contentPixels += 1
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) return null
  const contentRatio = contentPixels / Math.max(1, sampledPixels)
  if (contentRatio > 0.92) return null
  return { minX, minY, maxX, maxY, step }
}

function cropWhitespace(canvas, context, padding = DEFAULT_CROP_PADDING) {
  const { width, height } = canvas
  const bounds = findContentBounds(context, width, height)
  if (!bounds) return { canvas, context, cropped: false }

  const cropX = Math.max(0, bounds.minX - padding)
  const cropY = Math.max(0, bounds.minY - padding)
  const cropRight = Math.min(width, bounds.maxX + bounds.step + padding)
  const cropBottom = Math.min(height, bounds.maxY + bounds.step + padding)
  const cropWidth = Math.max(1, cropRight - cropX)
  const cropHeight = Math.max(1, cropBottom - cropY)
  const removedWidthRatio = 1 - cropWidth / width
  const removedHeightRatio = 1 - cropHeight / height

  if ((removedWidthRatio < 0.03 && removedHeightRatio < 0.03) || cropWidth < width * 0.08 || cropHeight < height * 0.08) {
    return { canvas, context, cropped: false }
  }

  const nextCanvas = document.createElement('canvas')
  nextCanvas.width = cropWidth
  nextCanvas.height = cropHeight
  const nextContext = nextCanvas.getContext('2d', { willReadFrequently: true })
  if (!nextContext) return { canvas, context, cropped: false }
  nextContext.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
  return { canvas: nextCanvas, context: nextContext, cropped: true }
}

function applyPixelFilters(canvas, context, { grayscale, enhanceContrast }) {
  if (!grayscale && !enhanceContrast) return false
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData
  const contrast = enhanceContrast ? 1.28 : 1

  for (let index = 0; index < data.length; index += 4) {
    let r = data[index]
    let g = data[index + 1]
    let b = data[index + 2]

    if (grayscale) {
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      r = gray
      g = gray
      b = gray
    }

    if (enhanceContrast) {
      r = Math.max(0, Math.min(255, (r - 128) * contrast + 128))
      g = Math.max(0, Math.min(255, (g - 128) * contrast + 128))
      b = Math.max(0, Math.min(255, (b - 128) * contrast + 128))
    }

    data[index] = r
    data[index + 1] = g
    data[index + 2] = b
  }

  context.putImageData(imageData, 0, 0)
  return true
}

function scaleCanvas(canvas, scale) {
  if (scale <= 1) return { canvas, scaled: false }
  const maxScaleByDimension = MAX_OCR_DIMENSION / Math.max(canvas.width, canvas.height)
  const maxScaleByPixels = Math.sqrt(MAX_OCR_PIXELS / Math.max(1, canvas.width * canvas.height))
  const safeScale = Math.min(scale, maxScaleByDimension, maxScaleByPixels)
  if (safeScale <= 1.05) return { canvas, scaled: false }

  const nextCanvas = document.createElement('canvas')
  nextCanvas.width = Math.round(canvas.width * safeScale)
  nextCanvas.height = Math.round(canvas.height * safeScale)
  const nextContext = nextCanvas.getContext('2d')
  if (!nextContext) return { canvas, scaled: false }
  nextContext.imageSmoothingEnabled = true
  nextContext.imageSmoothingQuality = 'high'
  nextContext.drawImage(canvas, 0, 0, nextCanvas.width, nextCanvas.height)
  return { canvas: nextCanvas, scaled: true }
}

export async function preprocessImageForOcr(file, options = {}) {
  const useOriginal = Boolean(options.useOriginal)
  if (useOriginal) return { file, notes: ['使用原图识别'], usedOriginal: true }

  const enabled = Boolean(options.autoCrop || options.grayscale || options.enhanceContrast || options.upscale)
  if (!enabled) return { file, notes: ['使用原图识别'], usedOriginal: true }

  let loaded
  try {
    loaded = await loadImageSource(file)
    let { canvas, context } = drawToCanvas(loaded.source, loaded.width, loaded.height)
    const notes = []

    if (options.autoCrop) {
      const cropped = cropWhitespace(canvas, context)
      canvas = cropped.canvas
      context = cropped.context
      notes.push(cropped.cropped ? '自动裁剪空白边已启用' : '自动裁剪空白边未检测到可裁剪区域')
    }

    if (options.grayscale || options.enhanceContrast) {
      applyPixelFilters(canvas, context, options)
      if (options.grayscale) notes.push('灰度化已启用')
      if (options.enhanceContrast) notes.push('自动增强对比度已启用')
    }

    if (options.upscale) {
      const scaled = scaleCanvas(canvas, 1.8)
      canvas = scaled.canvas
      notes.push(scaled.scaled ? '放大后识别已启用' : '图片尺寸较大，已跳过放大')
    }

    const blob = await canvasToBlob(canvas)
    const processedFile = new File([blob], `ocr-preprocessed-${Date.now()}.png`, { type: 'image/png', lastModified: Date.now() })
    return { file: processedFile, notes, usedOriginal: false }
  } catch (error) {
    return { file, notes: ['图片预处理失败，已回退到原图识别'], error, usedOriginal: true }
  } finally {
    loaded?.close?.()
  }
}
