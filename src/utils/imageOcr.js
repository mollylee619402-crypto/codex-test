import { preprocessImageForOcr } from './imagePreprocess.js'
import { isSupportedImageFile } from './imageOcrSupport.js'

export { getSupportedImageHint, isSupportedImageFile } from './imageOcrSupport.js'

const DEFAULT_TESSERACT_MODULE_PATH = '/vendor/tesseract/tesseract.esm.min.js'
const DEFAULT_TESSERACT_WORKER_PATH = '/vendor/tesseract/worker.min.js'
const DEFAULT_TESSERACT_CORE_PATH = '/vendor/tesseract/tesseract-core-simd-lstm.wasm.js'
const DEFAULT_TESSDATA_PATH = '/tessdata'

let tesseractModulePromise

function mapProgressStatus(status = '') {
  if (status.includes('load') || status.includes('init')) return 'OCR 初始化中'
  if (status.includes('recogniz')) return '正在识别文字'
  return status || '正在识别文字'
}

function normalizePublicPath(path, fallbackPath) {
  const configuredPath = String(path || '').trim()
  const publicPath = configuredPath || fallbackPath
  if (/^https?:\/\//i.test(publicPath) || publicPath.startsWith('//')) {
    throw new Error('OCR 初始化失败：OCR 资源必须使用同源静态路径，不能依赖外部 CDN。')
  }
  if (publicPath.startsWith('/')) return publicPath
  return `${import.meta.env.BASE_URL || '/'}${publicPath}`.replace(/\/+/g, '/')
}

function getTesseractAssetPaths() {
  return {
    modulePath: normalizePublicPath(import.meta.env.VITE_TESSERACT_MODULE_PATH, DEFAULT_TESSERACT_MODULE_PATH),
    workerPath: normalizePublicPath(import.meta.env.VITE_TESSERACT_WORKER_PATH, DEFAULT_TESSERACT_WORKER_PATH),
    corePath: normalizePublicPath(import.meta.env.VITE_TESSERACT_CORE_PATH, DEFAULT_TESSERACT_CORE_PATH),
    langPath: normalizePublicPath(import.meta.env.VITE_TESSDATA_PATH, DEFAULT_TESSDATA_PATH)
  }
}

async function loadTesseract() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('OCR 初始化失败：图片识别只能在浏览器中运行。')
  }

  if (!tesseractModulePromise) {
    const { modulePath } = getTesseractAssetPaths()
    tesseractModulePromise = import(/* @vite-ignore */ modulePath).catch((error) => {
      tesseractModulePromise = undefined
      throw new Error(`OCR 初始化失败：无法加载本地 Tesseract.js 资源（${error?.message || '资源路径不可用'}）`)
    })
  }

  return tesseractModulePromise
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

  const { workerPath, corePath, langPath } = getTesseractAssetPaths()
  let worker
  try {
    worker = await createWorker('chi_sim+eng', 1, {
      workerPath,
      corePath,
      langPath,
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
