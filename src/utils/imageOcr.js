import { createWorker } from 'tesseract.js'
import workerPath from 'tesseract.js/dist/worker.min.js?url'
import corePath from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.min.js?url'
import { preprocessImageForOcr } from './imagePreprocess.js'

const SUPPORTED_IMAGE_TYPES = new Map([
  ['image/png', 'PNG'],
  ['image/jpeg', 'JPG/JPEG'],
  ['image/webp', 'WebP']
])

const OCR_LANGUAGE = 'chi_sim+eng'
const TESSDATA_PATH = import.meta.env.VITE_TESSDATA_PATH || 'https://tessdata.projectnaptha.com/4.0.0'
const CHINESE_LANGUAGE_RE = /(chi_sim|中文|traineddata|lang|language|fetch|network|404|403|load)/i

export function isSupportedImageFile(file) {
  if (!file) return false
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return true
  return /\.(png|jpe?g|webp)$/i.test(file.name || '')
}

export function getSupportedImageHint() {
  return '请上传 PNG、JPG、JPEG 或 WebP 格式的流程图图片。'
}

function mapProgressStatus(status = '') {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('loading language') || normalized.includes('initialize')) return '正在加载中文识别模型…'
  if (normalized.includes('load') || normalized.includes('init')) return '正在初始化 OCR…'
  if (normalized.includes('recogniz')) return '正在识别文字…'
  return status || '正在识别文字…'
}

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

function createOcrError(phase, error) {
  const rawMessage = getErrorMessage(error)
  const isLanguageFailure = CHINESE_LANGUAGE_RE.test(rawMessage)
  const prefix = phase === 'init' ? 'OCR 初始化失败' : 'OCR 识别失败'
  const hint = isLanguageFailure
    ? '中文 OCR 语言包加载失败，请检查网络或稍后重试。'
    : rawMessage
  return new Error(`${prefix}：${hint}`)
}

async function createTesseractWorker(onProgress) {
  console.log('[FlowCraft OCR] loading tesseract')
  if (typeof createWorker !== 'function') {
    throw new Error('Tesseract.js createWorker API 不可用，请检查 tesseract.js 版本。')
  }

  console.log(`[FlowCraft OCR] language loading: ${OCR_LANGUAGE}`)
  onProgress?.({ status: '正在加载中文识别模型…', progress: 0 })

  const worker = await createWorker(OCR_LANGUAGE, 1, {
    workerPath,
    corePath,
    langPath: TESSDATA_PATH,
    logger: (message) => {
      const progress = Number.isFinite(message?.progress) ? Math.round(message.progress * 100) : 0
      onProgress?.({ status: mapProgressStatus(message?.status), progress })
    },
    errorHandler: (error) => {
      console.error('[FlowCraft OCR] worker error', error)
    }
  })
  console.log('[FlowCraft OCR] worker created')
  return worker
}

export async function recognizeImageText(file, { onProgress, preprocessOptions, onPreprocess } = {}) {
  if (!isSupportedImageFile(file)) {
    throw new Error('图片格式不支持。')
  }

  console.log('[FlowCraft OCR] start', { name: file.name, type: file.type, size: file.size })
  let worker
  let preparedImage = { file, notes: ['使用原图识别'], usedOriginal: true }

  try {
    onProgress?.({ status: '正在初始化 OCR…', progress: 0 })
    worker = await createTesseractWorker(onProgress)
  } catch (error) {
    console.error('[FlowCraft OCR] error', error)
    throw createOcrError('init', error)
  }

  try {
    console.log('[FlowCraft OCR] preprocessing image')
    onPreprocess?.({ status: '正在预处理图片…', progress: 0 })
    preparedImage = await preprocessImageForOcr(file, preprocessOptions)
    if (preparedImage.error) console.warn('[FlowCraft OCR] preprocess fallback', preparedImage.error)
    onPreprocess?.({ status: preparedImage.notes.join('；') || '正在预处理图片…', progress: 100, notes: preparedImage.notes })

    console.log('[FlowCraft OCR] recognize start', {
      inputName: preparedImage.file?.name,
      inputType: preparedImage.file?.type,
      inputSize: preparedImage.file?.size,
      usedOriginal: preparedImage.usedOriginal
    })
    onProgress?.({ status: '正在识别文字…', progress: 0 })
    const result = await worker.recognize(preparedImage.file)
    const textLength = String(result?.data?.text || '').trim().length
    console.log('[FlowCraft OCR] recognize complete')
    console.log('[FlowCraft OCR] text length', textLength)
    onProgress?.({ status: '识别完成', progress: 100 })
    return result
  } catch (error) {
    console.error('[FlowCraft OCR] error', error)
    throw createOcrError('recognize', error)
  } finally {
    if (worker) {
      try {
        await worker.terminate()
      } catch (error) {
        console.warn('[FlowCraft OCR] worker terminate failed', error)
      }
    }
  }
}
