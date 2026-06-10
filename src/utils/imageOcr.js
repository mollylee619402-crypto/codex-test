import { preprocessImageForOcr } from './imagePreprocess.js'

const SUPPORTED_IMAGE_TYPES = new Map([
  ['image/png', 'PNG'],
  ['image/jpeg', 'JPG/JPEG'],
  ['image/webp', 'WebP']
])

const TESSERACT_CDN_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js'
const TESSDATA_URL = 'https://tessdata.projectnaptha.com/4.0.0'

export function isSupportedImageFile(file) {
  if (!file) return false
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return true
  return /\.(png|jpe?g|webp)$/i.test(file.name || '')
}

export function getSupportedImageHint() {
  return '请上传 PNG、JPG、JPEG 或 WebP 格式的流程图图片。'
}

function mapProgressStatus(status = '') {
  if (status.includes('load') || status.includes('init')) return 'OCR 初始化中'
  if (status.includes('recogniz')) return '正在识别文字'
  return status || '正在识别文字'
}

async function loadTesseract() {
  try {
    return await import(/* @vite-ignore */ TESSERACT_CDN_URL)
  } catch (error) {
    throw new Error(`OCR 初始化失败：无法加载 Tesseract.js（${error?.message || '网络或浏览器限制'}）`)
  }
}

export async function recognizeImageText(file, { onProgress, preprocessOptions, onPreprocess } = {}) {
  if (!isSupportedImageFile(file)) {
    throw new Error('图片格式不支持。')
  }

  onPreprocess?.({ status: '正在预处理图片', progress: 0 })
  const preparedImage = await preprocessImageForOcr(file, preprocessOptions)
  onPreprocess?.({ status: preparedImage.notes.join('；') || '正在预处理图片', progress: 100, notes: preparedImage.notes })

  const { createWorker } = await loadTesseract()
  if (typeof createWorker !== 'function') {
    throw new Error('OCR 初始化失败：Tesseract.js 加载异常。')
  }

  let worker
  try {
    worker = await createWorker('chi_sim+eng', 1, {
      langPath: TESSDATA_URL,
      logger: (message) => {
        const progress = Number.isFinite(message?.progress) ? Math.round(message.progress * 100) : 0
        onProgress?.({ status: mapProgressStatus(message?.status), progress })
      }
    })
    onProgress?.({ status: '正在识别文字', progress: 0 })
    const result = await worker.recognize(preparedImage.file)
    onProgress?.({ status: '识别完成', progress: 100 })
    return result
  } catch (error) {
    const message = error?.message || '请检查图片清晰度后重试'
    throw new Error(message.includes('OCR 初始化失败') ? message : `OCR 识别失败：${message}`)
  } finally {
    if (worker) await worker.terminate()
  }
}
