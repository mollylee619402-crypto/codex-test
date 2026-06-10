const MAX_OCR_DIMENSION = 4200
const MAX_OCR_PIXELS = 18000000
const DEFAULT_CROP_PADDING = 32

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

function isContentPixel(r, g, b, alpha) {
  if (alpha <= 12) return false
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  const saturation = max - min

  // Detect black text, grey connector lines, colored fills/borders, and light grey flowchart strokes.
  if (luminance < 238) return true
  if (luminance < 248 && saturation > 10) return true
  return max < 252 && min < 252 && saturation <= 18
}

function findContentBounds(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height)
  const { data } = imageData
  const step = Math.max(1, Math.floor(Math.max(width, height) / 1600))
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
      if (isContentPixel(data[index], data[index + 1], data[index + 2], data[index + 3])) {
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
  if (contentRatio > 0.96 || contentRatio < 0.0002) return null
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

  if ((removedWidthRatio < 0.02 && removedHeightRatio < 0.02) || cropWidth < width * 0.06 || cropHeight < height * 0.06) {
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
  const contrast = enhanceContrast ? 1.55 : 1

  for (let index = 0; index < data.length; index += 4) {
    const sourceR = data[index]
    const sourceG = data[index + 1]
    const sourceB = data[index + 2]
    const gray = Math.round(0.299 * sourceR + 0.587 * sourceG + 0.114 * sourceB)
    let r = grayscale ? gray : sourceR
    let g = grayscale ? gray : sourceG
    let b = grayscale ? gray : sourceB

    if (enhanceContrast) {
      const highContrastGray = gray < 210 ? Math.max(0, Math.round((gray - 128) * contrast + 110)) : 255
      const target = gray < 235 ? highContrastGray : 255
      r = grayscale ? target : Math.max(0, Math.min(255, (r - 128) * contrast + 128))
      g = grayscale ? target : Math.max(0, Math.min(255, (g - 128) * contrast + 128))
      b = grayscale ? target : Math.max(0, Math.min(255, (b - 128) * contrast + 128))
      if (gray < 190) {
        r = Math.min(r, target)
        g = Math.min(g, target)
        b = Math.min(b, target)
      }
    }

    data[index] = r
    data[index + 1] = g
    data[index + 2] = b
  }

  context.putImageData(imageData, 0, 0)
  return true
}

function applyBinarization(canvas, context) {
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData

  for (let index = 0; index < data.length; index += 4) {
    const gray = Math.round(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2])
    if (gray >= 226) {
      data[index] = 255
      data[index + 1] = 255
      data[index + 2] = 255
    } else if (gray <= 175) {
      data[index] = 0
      data[index + 1] = 0
      data[index + 2] = 0
    }
  }

  context.putImageData(imageData, 0, 0)
}

function getUpscaleFactor(canvas, requestedUpscale) {
  const longest = Math.max(canvas.width, canvas.height)
  const shortest = Math.min(canvas.width, canvas.height)
  if (requestedUpscale) {
    if (longest < 1200 || shortest < 700) return 3.4
    if (longest < 2200) return 2.6
    return 2
  }
  if (longest < 1000 || shortest < 520) return 2.4
  if (longest < 1800) return 2
  return 1.6
}

function scaleCanvas(canvas, scale) {
  if (scale <= 1) return { canvas, scaled: false, scale: 1 }
  const maxScaleByDimension = MAX_OCR_DIMENSION / Math.max(canvas.width, canvas.height)
  const maxScaleByPixels = Math.sqrt(MAX_OCR_PIXELS / Math.max(1, canvas.width * canvas.height))
  const safeScale = Math.min(scale, maxScaleByDimension, maxScaleByPixels)
  if (safeScale <= 1.05) return { canvas, scaled: false, scale: 1 }

  const nextCanvas = document.createElement('canvas')
  nextCanvas.width = Math.round(canvas.width * safeScale)
  nextCanvas.height = Math.round(canvas.height * safeScale)
  const nextContext = nextCanvas.getContext('2d', { willReadFrequently: true })
  if (!nextContext) return { canvas, scaled: false, scale: 1 }
  nextContext.imageSmoothingEnabled = true
  nextContext.imageSmoothingQuality = 'high'
  nextContext.drawImage(canvas, 0, 0, nextCanvas.width, nextCanvas.height)
  return { canvas: nextCanvas, scaled: true, scale: safeScale }
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
      notes.push(cropped.cropped ? '已强制裁剪图形主体并保留边距' : '自动裁剪未检测到可裁剪区域，已继续使用原图')
    }

    const scaleFactor = getUpscaleFactor(canvas, options.upscale)
    const scaled = scaleCanvas(canvas, scaleFactor)
    canvas = scaled.canvas
    context = canvas.getContext('2d', { willReadFrequently: true }) || context
    notes.push(scaled.scaled ? `OCR 输入图已放大 ${scaled.scale.toFixed(1)}x` : '图片尺寸较大，已限制放大避免浏览器卡顿')

    if (options.grayscale || options.enhanceContrast) {
      applyPixelFilters(canvas, context, { grayscale: true, enhanceContrast: options.enhanceContrast })
      if (options.grayscale) notes.push('灰度化已启用')
      if (options.enhanceContrast) notes.push('高对比度增强已启用')
    }

    if (options.enhanceContrast) {
      applyBinarization(canvas, context)
      notes.push('二值化清晰化已启用')
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
