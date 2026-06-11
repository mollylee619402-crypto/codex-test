import { preprocessImageForOcr } from './imagePreprocess.js'
import { isSupportedImageFile } from './imageOcrSupport.js'

export { getSupportedImageHint, isSupportedImageFile } from './imageOcrSupport.js'

const PRIMARY_OCR_LANGUAGE = 'chi_sim+eng'
const FALLBACK_OCR_LANGUAGE = 'eng'
const CHINESE_LANGUAGE_FALLBACK_MESSAGE = '中文 OCR 语言包加载失败，已尝试英文识别；中文流程图建议稍后重试或手动输入。'
const OCR_MODULE_LOAD_ERROR_MESSAGE = 'OCR 模块加载失败：请检查网络或稍后重试。你仍可手动输入结构化节点。'

let tesseractModulePromise
const TESSERACT_PACKAGE_IMPORT = 'tesseract.js'
const TESSERACT_CDN_IMPORT = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js'

function mapProgressStatus(status = '') {
  if (status.includes('load') || status.includes('init')) return 'OCR 初始化中'
  if (status.includes('recogniz')) return '正在识别文字'
  return status || '正在识别文字'
}

async function loadTesseract() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('OCR 初始化失败：图片识别只能在浏览器中运行。')
  }

  if (!tesseractModulePromise) {
    console.info('[FlowCraft OCR] importing tesseract.js')
    tesseractModulePromise = import(/* @vite-ignore */ TESSERACT_PACKAGE_IMPORT)
      .catch((error) => {
        console.warn('[FlowCraft OCR] npm package import failed, trying CDN fallback', error)
        return import(/* @vite-ignore */ TESSERACT_CDN_IMPORT)
      })
      .then((module) => {
        console.info('[FlowCraft OCR] tesseract module loaded')
        return module
      })
      .catch((error) => {
        tesseractModulePromise = undefined
        console.error('[FlowCraft OCR] error', error)
        throw new Error(OCR_MODULE_LOAD_ERROR_MESSAGE)
      })
  }

  return tesseractModulePromise
}

async function createOcrWorker(createWorker, language, onProgress) {
  console.info('[FlowCraft OCR] worker creating')
  const worker = await createWorker(language, 1, {
    logger: (message) => {
      const progress = Number.isFinite(message?.progress) ? Math.round(message.progress * 100) : 0
      onProgress?.({ status: mapProgressStatus(message?.status), progress })
    }
  })
  console.info('[FlowCraft OCR] worker ready')
  return worker
}

async function createWorkerWithLanguageFallback(createWorker, onProgress, onWarning) {
  let worker
  try {
    worker = await createOcrWorker(createWorker, PRIMARY_OCR_LANGUAGE, onProgress)
    return { worker, language: PRIMARY_OCR_LANGUAGE }
  } catch (error) {
    console.error('[FlowCraft OCR] error', error)
    if (worker) await worker.terminate()
    onWarning?.(CHINESE_LANGUAGE_FALLBACK_MESSAGE)
    onProgress?.({ status: CHINESE_LANGUAGE_FALLBACK_MESSAGE, progress: 0 })
    return { worker: await createOcrWorker(createWorker, FALLBACK_OCR_LANGUAGE, onProgress), language: FALLBACK_OCR_LANGUAGE }
  }
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

  let worker
  try {
    onPreprocess?.({ status: '正在预处理图片', progress: 0 })
    const preparedImage = await preprocessImageForOcr(file, preprocessOptions)
    onPreprocess?.({ status: preparedImage.notes.join('；') || '正在预处理图片', progress: 100, notes: preparedImage.notes })

    const { createWorker } = await loadTesseract()
    if (typeof createWorker !== 'function') {
      throw new Error('OCR 初始化失败：Tesseract.js 加载异常。')
    }

    const workerInfo = await createWorkerWithLanguageFallback(createWorker, onProgress, notifyWarning)
    worker = workerInfo.worker
    let workerLanguage = workerInfo.language
    onProgress?.({ status: '正在识别文字', progress: 0 })
    console.info('[FlowCraft OCR] recognize start')
    let result
    try {
      result = await worker.recognize(preparedImage.file)
    } catch (error) {
      if (workerLanguage !== PRIMARY_OCR_LANGUAGE) throw error
      console.error('[FlowCraft OCR] error', error)
      await worker.terminate()
      notifyWarning(CHINESE_LANGUAGE_FALLBACK_MESSAGE)
      onProgress?.({ status: CHINESE_LANGUAGE_FALLBACK_MESSAGE, progress: 0 })
      worker = await createOcrWorker(createWorker, FALLBACK_OCR_LANGUAGE, onProgress)
      workerLanguage = FALLBACK_OCR_LANGUAGE
      console.info('[FlowCraft OCR] recognize start')
      result = await worker.recognize(preparedImage.file)
    }
    console.info('[FlowCraft OCR] recognize complete')
    onProgress?.({ status: warningMessage || '识别完成', progress: 100 })
    if (warningMessage && result && typeof result === 'object') result.warning = warningMessage
    return result
  } catch (error) {
    console.error('[FlowCraft OCR] error', error)
    if (error?.message === OCR_MODULE_LOAD_ERROR_MESSAGE) throw error
    const message = error?.message || '请检查图片清晰度后重试'
    throw new Error(message.includes('OCR 初始化失败') ? message : `OCR 识别失败：${message}`)
  } finally {
    if (worker) await worker.terminate()
  }
}
