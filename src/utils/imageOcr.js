import { preprocessImageForOcr } from './imagePreprocess.js'
import { isSupportedImageFile } from './imageOcrSupport.js'

export { getSupportedImageHint, isSupportedImageFile } from './imageOcrSupport.js'

const PRIMARY_OCR_LANGUAGE = 'chi_sim+eng'
const FALLBACK_OCR_LANGUAGE = 'eng'
const CHINESE_LANGUAGE_FALLBACK_MESSAGE = '中文 OCR 语言包加载失败，已降级为英文识别。中文流程图建议手动校对或稍后重试。'
const OCR_MODULE_LOAD_ERROR_MESSAGE = 'OCR 模块加载失败：Tesseract.js 包无法加载。你仍可手动输入结构化节点。'

let tesseractModulePromise
let ocrWorkerPromise
let cachedOcrWorker
let cachedOcrLanguage = ''
let activeProgressHandler

function getErrorMessage(error) {
  if (!error) return '未知错误'
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function mapProgressStatus(status = '') {
  if (status.includes('recogniz')) return '正在识别文字'
  if (status.includes('load') || status.includes('init')) return 'OCR 初始化中'
  return status || '正在识别文字'
}

function reportProgress(onProgress, status, progress = 0, extra = {}) {
  onProgress?.({ status, progress, ...extra })
}

async function loadTesseract() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('OCR 初始化失败：图片识别只能在浏览器中运行。')
  }

  if (!tesseractModulePromise) {
    console.info('[FlowCraft OCR] import tesseract.js start')
    tesseractModulePromise = import('tesseract.js')
      .then((module) => {
        console.info('[FlowCraft OCR] import tesseract.js success')
        return module
      })
      .catch((error) => {
        tesseractModulePromise = undefined
        console.error('[FlowCraft OCR] final error', error)
        const detail = getErrorMessage(error)
        throw new Error(`${OCR_MODULE_LOAD_ERROR_MESSAGE}${detail ? `（${detail}）` : ''}`)
      })
  }

  return tesseractModulePromise
}

async function createOcrWorker(createWorker, language, onProgress) {
  const isFallback = language === FALLBACK_OCR_LANGUAGE
  console.info(isFallback ? '[FlowCraft OCR] fallback createWorker eng start' : '[FlowCraft OCR] createWorker chi_sim+eng start')
  reportProgress(onProgress, isFallback ? '中文模型加载失败，正在尝试英文模型…' : 'OCR 中文模型加载中…', 0)
  const worker = await createWorker(language, 1, {
    logger: (message) => {
      const progress = Number.isFinite(message?.progress) ? Math.round(message.progress * 100) : 0
      activeProgressHandler?.({ status: mapProgressStatus(message?.status), progress })
    }
  })
  console.info(isFallback ? '[FlowCraft OCR] fallback createWorker eng success' : '[FlowCraft OCR] createWorker chi_sim+eng success')
  reportProgress(onProgress, 'OCR 初始化成功', 100)
  return worker
}

async function safelyTerminateWorker(worker) {
  if (!worker) return
  try {
    await worker.terminate()
  } catch (error) {
    console.warn('[FlowCraft OCR] worker terminate failed', error)
  }
}

async function initializeOcrWorker(onProgress, onWarning) {
  reportProgress(onProgress, 'OCR 模块加载中…', 0)
  const { createWorker } = await loadTesseract()
  if (typeof createWorker !== 'function') {
    throw new Error('OCR 初始化失败：Tesseract.js 包未导出 createWorker 函数。')
  }

  let primaryWorker
  try {
    primaryWorker = await createOcrWorker(createWorker, PRIMARY_OCR_LANGUAGE, onProgress)
    return { worker: primaryWorker, language: PRIMARY_OCR_LANGUAGE, warning: '' }
  } catch (error) {
    console.error('[FlowCraft OCR] createWorker chi_sim+eng failed', error)
    await safelyTerminateWorker(primaryWorker)
    const warning = CHINESE_LANGUAGE_FALLBACK_MESSAGE
    onWarning?.(warning)
    reportProgress(onProgress, '中文模型加载失败，正在尝试英文模型…', 0, { warning })

    let fallbackWorker
    try {
      fallbackWorker = await createOcrWorker(createWorker, FALLBACK_OCR_LANGUAGE, onProgress)
      return { worker: fallbackWorker, language: FALLBACK_OCR_LANGUAGE, warning }
    } catch (fallbackError) {
      console.error('[FlowCraft OCR] fallback createWorker eng failed', fallbackError)
      await safelyTerminateWorker(fallbackWorker)
      const primaryMessage = getErrorMessage(error)
      const fallbackMessage = getErrorMessage(fallbackError)
      throw new Error(`OCR 初始化失败：中文模型加载失败（${primaryMessage}）；英文模型加载失败（${fallbackMessage}）。`)
    }
  }
}

export async function getOcrWorker({ onProgress, onWarning } = {}) {
  activeProgressHandler = onProgress

  if (cachedOcrWorker) {
    if (cachedOcrLanguage === FALLBACK_OCR_LANGUAGE) onWarning?.(CHINESE_LANGUAGE_FALLBACK_MESSAGE)
    reportProgress(onProgress, 'OCR 初始化成功', 100)
    return {
      worker: cachedOcrWorker,
      language: cachedOcrLanguage,
      warning: cachedOcrLanguage === FALLBACK_OCR_LANGUAGE ? CHINESE_LANGUAGE_FALLBACK_MESSAGE : ''
    }
  }

  const isJoiningExistingInitialization = Boolean(ocrWorkerPromise)
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = initializeOcrWorker(onProgress, onWarning)
      .then((workerInfo) => {
        cachedOcrWorker = workerInfo.worker
        cachedOcrLanguage = workerInfo.language
        return workerInfo
      })
      .catch((error) => {
        cachedOcrWorker = undefined
        cachedOcrLanguage = ''
        ocrWorkerPromise = undefined
        console.error('[FlowCraft OCR] final error', error)
        throw error
      })
  }

  const workerInfo = await ocrWorkerPromise
  if (isJoiningExistingInitialization && workerInfo.language === FALLBACK_OCR_LANGUAGE && workerInfo.warning) onWarning?.(workerInfo.warning)
  return workerInfo
}

export async function terminateOcrWorker() {
  const worker = cachedOcrWorker
  cachedOcrWorker = undefined
  cachedOcrLanguage = ''
  ocrWorkerPromise = undefined
  activeProgressHandler = undefined
  await safelyTerminateWorker(worker)
}

export async function recognizeImageText(file, { onProgress, preprocessOptions, onPreprocess, onWarning } = {}) {
  console.info('[FlowCraft OCR] start')

  if (!isSupportedImageFile(file)) {
    throw new Error('图片格式不支持。')
  }

  let warningMessage = ''
  const notifyWarning = (message) => {
    warningMessage = message
    onWarning?.(message)
  }

  try {
    onPreprocess?.({ status: '正在预处理图片', progress: 0 })
    const preparedImage = await preprocessImageForOcr(file, preprocessOptions)
    onPreprocess?.({ status: preparedImage.notes.join('；') || '正在预处理图片', progress: 100, notes: preparedImage.notes })

    const workerInfo = await getOcrWorker({ onProgress, onWarning: notifyWarning })
    const { worker } = workerInfo
    if (workerInfo.warning) warningMessage = workerInfo.warning

    activeProgressHandler = onProgress
    onProgress?.({ status: '正在识别文字', progress: 0 })
    console.info('[FlowCraft OCR] recognize start')
    const result = await worker.recognize(preparedImage.file)
    console.info('[FlowCraft OCR] recognize complete')
    onProgress?.({ status: warningMessage || '识别完成', progress: 100 })
    if (warningMessage && result && typeof result === 'object') result.warning = warningMessage
    return result
  } catch (error) {
    console.error('[FlowCraft OCR] final error', error)
    const message = getErrorMessage(error)
    if (message.includes('OCR 模块加载失败') || message.includes('OCR 初始化失败')) throw error
    throw new Error(`OCR 识别失败：${message || '请检查图片清晰度后重试'}`)
  }
}
