import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupportedImageHint, isSupportedImageFile } from '../utils/imageOcrSupport.js'
import { clipboardSupportsFiles, getImageFileFromClipboard, isEditablePasteTarget } from '../utils/clipboardImage.js'
import { getFirstSupportedDraggedImage } from '../utils/dragDropImage.js'
import { ocrToStructuredInput } from '../utils/ocrToStructuredInput.js'
import { cleanOcrText } from '../utils/ocrTextCleaner.js'
import { extractDiagramWithVision } from '../utils/visionExtract.js'
import ImageSelectionOverlay from './ImageSelectionOverlay.jsx'

const IMPORT_METHODS = {
  AI: 'ai',
  OCR: 'ocr',
  ASSIST: 'assist-redraw',
  MANUAL: 'manual-edit'
}

const RECOGNITION_MODES = {
  FULL: 'full',
  SEGMENTED: 'segmented',
  MANUAL: 'manual'
}

const DEFAULT_PREPROCESS_OPTIONS = {
  enhanceContrast: true,
  grayscale: false,
  autoCrop: true,
  upscale: false,
  useOriginal: false
}

const ASSIST_NODE_TYPES = {
  STAGE: 'stage',
  NODE: 'node',
  CHILD: 'child',
  CAPTION: 'caption'
}

const ASSIST_NODE_LABELS = {
  [ASSIST_NODE_TYPES.STAGE]: '阶段',
  [ASSIST_NODE_TYPES.NODE]: '节点',
  [ASSIST_NODE_TYPES.CHILD]: '子节点',
  [ASSIST_NODE_TYPES.CAPTION]: '图题'
}

const AI_QUOTA_FALLBACK_MESSAGE = 'AI 识图为高级功能，需要 API 额度。额度不足时可使用图片辅助重绘模式。'
const STAGE_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

function isPdfFile(file) {
  return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '')
}

function isAiQuotaError(error) {
  const source = `${error?.message || ''} ${error?.code || ''} ${error?.status || ''}`.toLowerCase()
  return error?.status === 429 || /quota|insufficient_quota|billing|额度|余额|超限|exceeded/.test(source)
}

function createDraftNode(type, text, parentId = '') {
  return {
    id: crypto.randomUUID?.() || `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    text: String(text || '').trim(),
    parentId,
    order: Date.now()
  }
}

function cleanAssistLines(value = '') {
  return cleanOcrText(value, { structure: false }).lines
}


function captionFromAssistText(text = '') {
  const normalized = String(text || '').trim()
  const match = normalized.match(/^(图\s*[\d０-９]+(?:\s*[.．。\-－—–]\s*[\d０-９]+)*)\s*[-—–:：]?\s*(.*)$/)
  if (!match) return { figureNumber: '', figureTitle: normalized }
  return {
    figureNumber: match[1].replace(/\s+/g, '').replace(/[．。]/g, '.').replace(/[－—–]/g, '-'),
    figureTitle: match[2].trim()
  }
}

function formatDraftNodes(draftNodes = []) {
  const output = []
  const nodes = draftNodes.filter((node) => node.type !== ASSIST_NODE_TYPES.CAPTION && node.text.trim())
  let stageIndex = 0

  nodes.forEach((node, index) => {
    if (node.type === ASSIST_NODE_TYPES.STAGE) {
      stageIndex += 1
      if (output.length) output.push('')
      output.push(`阶段${STAGE_NUMERALS[stageIndex - 1] || stageIndex}：${node.text.trim().replace(/^阶段[一二三四五六七八九十\d]+[:：]/, '')}`)
      return
    }

    if (node.type === ASSIST_NODE_TYPES.CHILD) {
      const previousParentIndex = [...nodes.slice(0, index)].reverse().findIndex((item) => item.type === ASSIST_NODE_TYPES.NODE && item.text.trim())
      if (previousParentIndex < 0 && !node.parentId) output.push(`* ${node.text.trim()}`)
      else output.push(`  * ${node.text.trim()}`)
      return
    }

    output.push(`* ${node.text.trim()}`)
  })

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function ImageImportPanel({ onApply, onDetectedCaption, diagramType, projectConfig, onTemplateTypeDetected, onVisionResult }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [resultText, setResultText] = useState('')
  const [rawOcrText, setRawOcrText] = useState('')
  const [recognizedLineCount, setRecognizedLineCount] = useState(0)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isPointerInDropZone, setIsPointerInDropZone] = useState(false)
  const [preprocessOptions, setPreprocessOptions] = useState(DEFAULT_PREPROCESS_OPTIONS)
  const [preprocessNotes, setPreprocessNotes] = useState([])
  const [recognitionMethod, setRecognitionMethod] = useState(IMPORT_METHODS.ASSIST)
  const [recognitionMode, setRecognitionMode] = useState(RECOGNITION_MODES.FULL)
  const [detectedBoxes, setDetectedBoxes] = useState([])
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [manualSelection, setManualSelection] = useState(null)
  const [segmentDetails, setSegmentDetails] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [qualityHint, setQualityHint] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiWarnings, setAiWarnings] = useState([])
  const [isAiRecognizing, setIsAiRecognizing] = useState(false)
  const [draftNodes, setDraftNodes] = useState([])
  const [assistSelectionText, setAssistSelectionText] = useState('')
  const [assistBatchText, setAssistBatchText] = useState('')
  const [assistZoom, setAssistZoom] = useState('fit')
  const [assistTool, setAssistTool] = useState('select')
  const [isPanning, setIsPanning] = useState(false)
  const imagePreviewRef = useRef(null)
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)
  const dragDepthRef = useRef(0)
  const panStartRef = useRef(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const setImportedFile = useCallback((nextFile, sourceMessage) => {
    if (!nextFile) return

    if (isPdfFile(nextFile)) {
      setStatus('PDF 识别功能即将支持。当前建议先将 PDF 中的流程图截图后粘贴或上传。')
      resetFileInput()
      return
    }

    if (!isSupportedImageFile(nextFile)) {
      setStatus('图片格式不支持，请上传 PNG、JPG、JPEG 或 WEBP。')
      resetFileInput()
      return
    }

    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl)
      return URL.createObjectURL(nextFile)
    })
    setFile(nextFile)
    setResultText('')
    setRawOcrText('')
    setRecognizedLineCount(0)
    setProgress(0)
    setPreprocessNotes([])
    setDetectedBoxes([])
    setManualSelection(null)
    setSegmentDetails([])
    setQualityHint('')
    setAiResult(null)
    setAiWarnings([])
    setDraftNodes([])
    setAssistSelectionText('')
    setAssistBatchText('')
    setImageNaturalSize({ width: 0, height: 0 })
    setStatus(file ? '已替换当前图片' : sourceMessage)
    resetFileInput()
  }, [file])

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    setImportedFile(nextFile, '图片上传成功')
  }

  const handlePasteImage = useCallback((event, sourceMessage = '已粘贴图片') => {
    if (!clipboardSupportsFiles(event)) {
      setStatus('当前浏览器不支持图片粘贴，请改用上传方式。')
      return false
    }

    const pastedFile = getImageFileFromClipboard(event)
    if (!pastedFile) {
      setStatus('未检测到图片，请复制图片后再粘贴。')
      return false
    }

    event.preventDefault()
    setImportedFile(pastedFile, sourceMessage)
    if (file) setStatus('已替换当前图片')
    else setStatus(sourceMessage)
    return true
  }, [file, setImportedFile])

  useEffect(() => {
    const handleDocumentPaste = (event) => {
      if (event.defaultPrevented || !isPointerInDropZone || isEditablePasteTarget(event.target)) return
      handlePasteImage(event)
    }

    document.addEventListener('paste', handleDocumentPaste)
    return () => document.removeEventListener('paste', handleDocumentPaste)
  }, [handlePasteImage, isPointerInDropZone])

  const handleDropZonePaste = (event) => {
    handlePasteImage(event)
  }

  const handleDragEnter = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current += 1
    setIsDragActive(true)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragActive(true)
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragActive(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = 0
    setIsDragActive(false)

    const { file: droppedFile, multiple, unsupported } = getFirstSupportedDraggedImage(event.dataTransfer)
    if (unsupported || !droppedFile) {
      setStatus('图片格式不支持，请上传 PNG、JPG、JPEG 或 WEBP。')
      return
    }

    setImportedFile(droppedFile, multiple ? '已载入第一张图片。' : '已拖拽导入图片')
    if (file) setStatus('已替换当前图片')
    else setStatus(multiple ? '已载入第一张图片。' : '已拖拽导入图片')
  }

  const detectBoxes = async ({ silent = false } = {}) => {
    if (!file) {
      setStatus(`请先上传或粘贴参考图。${getSupportedImageHint()}`)
      return []
    }
    setIsDetecting(true)
    if (!silent) setStatus('正在检测流程框…')
    try {
      const { detectFlowBoxes } = await import('../utils/flowBoxDetector.js')
      const detection = await detectFlowBoxes(file)
      setDetectedBoxes(detection.boxes)
      setImageNaturalSize({ width: detection.imageWidth, height: detection.imageHeight })
      if (!detection.boxes.length) {
        setStatus('未检测到明显流程框，已回退为整图识别。')
      } else {
        const manyTip = detection.boxes.length > 30 ? '检测到区域较多，建议手动框选关键区域。' : ''
        setQualityHint(manyTip)
        setStatus(`已检测到 ${detection.boxes.length} 个候选流程框${manyTip ? `。${manyTip}` : ''}`)
      }
      return detection.boxes
    } catch (error) {
      console.warn('[FlowCraft OCR] box detection failed', error)
      setDetectedBoxes([])
      setStatus('未检测到流程框，已回退为整图识别。')
      return []
    } finally {
      setIsDetecting(false)
    }
  }

  const applyStructuredResult = (structuredResult, fallbackStatus, warningMessage = '') => {
    setRawOcrText(structuredResult.rawText || structuredResult.rawLines?.join('\n') || '')
    setRecognizedLineCount(structuredResult.lines?.length || 0)
    if (structuredResult.caption?.figureNumber || structuredResult.caption?.figureTitle) {
      onDetectedCaption?.(structuredResult.caption)
    }
    if (!structuredResult.text.trim()) {
      if (!resultText.trim()) setResultText('')
      setStatus('未识别到有效文字')
      return
    }
    setResultText(structuredResult.text)
    const qualityTip = (structuredResult.lines?.length || 0) < 3 ? '识别结果较少，建议手动框选关键区域。' : fallbackStatus
    setQualityHint(qualityTip)
    setStatus(warningMessage || qualityTip)
    setProgress(100)
  }

  const recognizeFullImage = async () => {
    const { recognizeImageText } = await import('../utils/imageOcr.js')
    let warningMessage = ''
    const ocrResult = await recognizeImageText(file, {
      preprocessOptions,
      onPreprocess: ({ status: nextStatus, notes }) => {
        setStatus(nextStatus || '正在预处理图片')
        setPreprocessNotes(notes || [])
      },
      onProgress: ({ status: nextStatus, progress: nextProgress }) => {
        setStatus(nextStatus || '正在识别文字')
        setProgress(nextProgress || 0)
      },
      onWarning: (message) => {
        warningMessage = message
        setStatus(message)
      }
    })
    applyStructuredResult(ocrToStructuredInput(ocrResult), '已完成 OCR，并自动清洗为结构化节点，请人工校对。', warningMessage || ocrResult.warning)
  }

  const recognizeManualSelection = async () => {
    if (!manualSelection || manualSelection.width < 8 || manualSelection.height < 8) {
      setStatus('请先在图片上框选需要识别的区域。')
      return
    }
    setStatus('正在识别手动框选区域…')
    const { cropImageRegion } = await import('../utils/flowBoxDetector.js')
    const { recognizeImageText } = await import('../utils/imageOcr.js')
    const croppedFile = await cropImageRegion(file, manualSelection, { padding: 8, scale: 1.8, binarize: true })
    let warningMessage = ''
    const ocrResult = await recognizeImageText(croppedFile, {
      preprocessOptions: { enhanceContrast: true, grayscale: true, autoCrop: false, upscale: false, useOriginal: false },
      onProgress: ({ status: nextStatus, progress: nextProgress }) => {
        setStatus(nextStatus || '正在识别手动框选区域…')
        setProgress(nextProgress || 0)
      },
      onWarning: (message) => {
        warningMessage = message
        setStatus(message)
      }
    })
    applyStructuredResult(ocrToStructuredInput(ocrResult), '手动框选识别完成，请人工校对。', warningMessage || ocrResult.warning)
  }

  const recognizeSegmentedImage = async () => {
    let boxes = detectedBoxes
    if (!boxes.length) boxes = await detectBoxes({ silent: true })
    if (!boxes.length) {
      setStatus('未检测到明显流程框，已回退为整图识别。')
      await recognizeFullImage()
      return
    }
    if (boxes.length > 30) setQualityHint('检测到区域较多，建议手动框选关键区域。默认仅识别前 20 个高置信度框。')
    const { recognizeSegmentedImage: recognizeSegments } = await import('../utils/segmentedOcr.js')
    let warningMessage = ''
    const segmentedResult = await recognizeSegments(file, boxes, {
      maxSegments: 20,
      onSegmentStart: ({ index, total }) => {
        setStatus(`正在识别第 ${index} / ${total} 个区域…`)
        setProgress(Math.round(((index - 1) / Math.max(1, total)) * 100))
      },
      onProgress: ({ status: nextStatus, progress: nextProgress }) => {
        if (nextStatus) setStatus(nextStatus)
        setProgress(nextProgress || 0)
      },
      onWarning: (message) => {
        warningMessage = message
        setStatus(message)
      },
      onSegmentComplete: (detail) => {
        setSegmentDetails((current) => [...current, detail])
      }
    })
    setSegmentDetails(segmentedResult.details)
    setRawOcrText(segmentedResult.rawText)
    setRecognizedLineCount(segmentedResult.nodes.length)
    if (segmentedResult.caption?.figureNumber || segmentedResult.caption?.figureTitle) onDetectedCaption?.(segmentedResult.caption)
    if (!segmentedResult.text.trim()) {
      setResultText('')
      setStatus('分块识别未识别到有效节点，建议切换整图识别或手动框选关键区域。')
      return
    }
    setResultText(segmentedResult.text)
    const hint = segmentedResult.nodes.length < 3 ? '识别结果较少，建议手动框选关键区域。' : '分块识别完成。'
    setQualityHint(hint)
    setStatus(warningMessage || hint)
    setProgress(100)
  }

  const handleRecognize = async (isRetry = false) => {
    if (!file) {
      setStatus(`请先上传或粘贴参考图。${getSupportedImageHint()}`)
      return
    }

    setIsRecognizing(true)
    setProgress(0)
    setPreprocessNotes([])
    setResultText('')
    setRawOcrText('')
    setRecognizedLineCount(0)
    setSegmentDetails([])
    setQualityHint('')
    setStatus(isRetry ? '正在重新识别文字' : '正在识别文字')

    try {
      if (recognitionMode === RECOGNITION_MODES.MANUAL) await recognizeManualSelection()
      else if (recognitionMode === RECOGNITION_MODES.SEGMENTED) await recognizeSegmentedImage()
      else await recognizeFullImage()
    } catch (error) {
      const message = error?.message || '请检查图片清晰度'
      setResultText('')
      setRawOcrText('')
      setRecognizedLineCount(0)
      setProgress(0)
      setStatus(message.includes('OCR 模块加载失败') || message.includes('初始化') ? message : `${message.includes('OCR') ? message : 'OCR 失败，请检查图片清晰度'}。复杂流程图建议使用 AI 识图模式。`)
    } finally {
      setIsRecognizing(false)
    }
  }


  const handleAiRecognize = async () => {
    if (!file) {
      setStatus(`请先上传或粘贴参考图。${getSupportedImageHint()}`)
      return
    }

    setIsAiRecognizing(true)
    setProgress(0)
    setPreprocessNotes([])
    setSegmentDetails([])
    setQualityHint('')
    setAiWarnings([])
    setStatus('正在进行 AI 识图，请稍候…')

    try {
      const result = await extractDiagramWithVision(file, {
        templateType: diagramType,
        figureNumber: projectConfig?.figureNumber || '',
        figureTitle: projectConfig?.figureTitle || ''
      })
      setAiResult(result)
      setResultText(result.structuredInput)
      setRawOcrText('')
      setRecognizedLineCount(result.structuredInput.split(/\n+/).filter((line) => line.trim().replace(/^\s*[*-]\s*/, '')).length)
      setAiWarnings(result.warnings || [])
      setQualityHint('AI 识图结果可能不完整，请人工校对。')
      setProgress(100)
      if (result.figureNumber || result.figureTitle) onDetectedCaption?.({ figureNumber: result.figureNumber, figureTitle: result.figureTitle })
      if (result.templateType) onTemplateTypeDetected?.(result.templateType)
      onVisionResult?.(result)
      setStatus('AI 识图完成，已填入结构化结果编辑区，请人工校对后应用。')
    } catch (error) {
      const message = error?.message || 'AI 识图请求失败。网络异常，请稍后重试。'
      setAiResult(null)
      setAiWarnings([])
      if (isAiQuotaError(error)) {
        setStatus(AI_QUOTA_FALLBACK_MESSAGE)
      } else {
        setStatus(message)
      }
    } finally {
      setIsAiRecognizing(false)
    }
  }


  const recognizeAssistSelection = async () => {
    if (!file) {
      setStatus(`请先上传图片。${getSupportedImageHint()}`)
      return
    }
    if (!manualSelection || manualSelection.width < 8 || manualSelection.height < 8) {
      setStatus('请先框选图片中的节点区域。')
      return
    }

    setIsRecognizing(true)
    setProgress(0)
    setStatus('正在对选区放大 3x 并进行局部 OCR…')
    const { cropImageRegion } = await import('../utils/flowBoxDetector.js')
    const { recognizeImageText } = await import('../utils/imageOcr.js')

    try {
      const croppedFile = await cropImageRegion(file, manualSelection, { padding: 10, scale: 3, grayscale: true, enhanceContrast: true, binarize: false })
      const ocrResult = await recognizeImageText(croppedFile, {
        preprocessOptions: { enhanceContrast: true, grayscale: true, autoCrop: false, upscale: false, useOriginal: false },
        onProgress: ({ status: nextStatus, progress: nextProgress }) => {
          setStatus(nextStatus || '正在识别选区文字…')
          setProgress(nextProgress || 0)
        }
      })
      const cleaned = cleanAssistLines(ocrResult?.data?.text || '').join(' ')
      setAssistSelectionText(cleaned)
      setRawOcrText(ocrResult?.data?.text || '')
      setStatus(cleaned ? '选区 OCR 完成，可人工修改后添加到节点草稿区。' : '选区 OCR 未识别到有效文字，请手动输入后添加。')
      setProgress(100)
    } catch (error) {
      setAssistSelectionText('')
      setStatus(`${error?.message || '局部 OCR 失败'}。可直接手动输入节点文字，不影响后续生成。`)
      setProgress(0)
    } finally {
      setIsRecognizing(false)
    }
  }

  const addAssistDraftNode = (type, text = assistSelectionText) => {
    const cleanedText = cleanAssistLines(text).join(' ') || String(text || '').trim()
    if (!cleanedText) {
      setStatus('请先输入或识别选区文字。')
      return
    }
    if (type === ASSIST_NODE_TYPES.CHILD && !draftNodes.some((node) => node.type === ASSIST_NODE_TYPES.NODE && node.text.trim())) {
      setStatus('请先添加一个父节点，再添加子节点。')
      return
    }
    const parentId = type === ASSIST_NODE_TYPES.CHILD ? [...draftNodes].reverse().find((node) => node.type === ASSIST_NODE_TYPES.NODE && node.text.trim())?.id || '' : ''
    setDraftNodes((current) => [...current, createDraftNode(type, cleanedText, parentId)])
    if (type === ASSIST_NODE_TYPES.CAPTION) onDetectedCaption?.(captionFromAssistText(cleanedText))
    setAssistSelectionText('')
    setManualSelection(null)
    if (type === ASSIST_NODE_TYPES.CAPTION) setStatus('已更新图题。')
    else setStatus(`已添加为${ASSIST_NODE_LABELS[type]}。`)
  }

  const updateDraftNode = (id, patch) => {
    setDraftNodes((current) => current.map((node) => (node.id === id ? { ...node, ...patch } : node)))
  }

  const removeDraftNode = (id) => {
    setDraftNodes((current) => current.filter((node) => node.id !== id))
  }

  const moveDraftNode = (id, direction) => {
    setDraftNodes((current) => {
      const index = current.findIndex((node) => node.id === id)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next.map((node, order) => ({ ...node, order: order + 1 }))
    })
  }

  const generateAssistStructuredText = () => {
    const text = formatDraftNodes(draftNodes)
    if (!text) {
      setStatus('节点草稿为空，无法生成结构化文本。')
      return ''
    }
    setResultText(text)
    setRecognizedLineCount(draftNodes.filter((node) => node.text.trim()).length)
    const caption = draftNodes.find((node) => node.type === ASSIST_NODE_TYPES.CAPTION && node.text.trim())
    if (caption) onDetectedCaption?.(captionFromAssistText(caption.text.trim()))
    setStatus('已生成结构化文本。')
    return text
  }

  const applyAssistStructuredText = () => {
    const text = resultText.trim() || generateAssistStructuredText()
    if (!text.trim()) return
    onApply(text.trim(), null)
    setStatus('已应用到当前流程。')
  }

  const importBatchTextAsDraftNodes = () => {
    const lines = cleanAssistLines(assistBatchText)
    if (!lines.length) {
      setStatus('批量粘贴文本中没有可用行，请检查内容。')
      return
    }
    setDraftNodes((current) => [...current, ...lines.map((line) => createDraftNode(ASSIST_NODE_TYPES.NODE, line))])
    setAssistBatchText('')
    setStatus(`已从批量粘贴文本生成 ${lines.length} 个节点草稿，可继续调整阶段 / 子节点。`)
  }

  const handleAssistPanStart = (event) => {
    if (recognitionMethod !== IMPORT_METHODS.ASSIST || assistTool !== 'pan') return
    const box = event.currentTarget
    panStartRef.current = { x: event.clientX, y: event.clientY, left: box.scrollLeft, top: box.scrollTop }
    setIsPanning(true)
  }

  const handleAssistPanMove = (event) => {
    if (!panStartRef.current) return
    event.preventDefault()
    const box = event.currentTarget
    box.scrollLeft = panStartRef.current.left - (event.clientX - panStartRef.current.x)
    box.scrollTop = panStartRef.current.top - (event.clientY - panStartRef.current.y)
  }

  const handleAssistPanEnd = () => {
    panStartRef.current = null
    setIsPanning(false)
  }

  const handleApply = () => {
    if (!resultText.trim()) {
      setStatus('未识别到有效文字，暂无可应用内容。')
      return
    }
    onApply(resultText.trim(), aiResult)
    setStatus('已将识别结果应用到当前流程。')
  }

  const handleRemoveImage = () => {
    setFile(null)
    setResultText('')
    setRawOcrText('')
    setRecognizedLineCount(0)
    setStatus('已移除当前图片')
    setProgress(0)
    setPreprocessNotes([])
    setDetectedBoxes([])
    setManualSelection(null)
    setSegmentDetails([])
    setQualityHint('')
    setAiResult(null)
    setAiWarnings([])
    setDraftNodes([])
    setAssistSelectionText('')
    setAssistBatchText('')
    setImageNaturalSize({ width: 0, height: 0 })
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    resetFileInput()
  }

  const updatePreprocessOption = (key) => (event) => {
    const checked = event.target.checked
    setPreprocessOptions((current) => {
      if (key === 'useOriginal') {
        return { ...current, useOriginal: checked }
      }
      return { ...current, [key]: checked, useOriginal: checked ? false : current.useOriginal }
    })
  }

  return (
    <section className="config-card image-import-panel">
      <div className="config-card-heading">
        <h3>图片识别生成</h3>
        <span>上传参考图，框选内容并整理为可编辑结构化节点</span>
      </div>

      <p className="image-import-tip">
        推荐：上传参考图后，框选节点区域，可局部识别或手动输入文字，再添加为阶段、节点或子节点。
      </p>

      <div
        ref={dropZoneRef}
        className={`image-drop-zone ${isDragActive ? 'is-drag-active' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onPaste={handleDropZonePaste}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsPointerInDropZone(true)}
        onMouseLeave={() => setIsPointerInDropZone(false)}
      >
        <input
          ref={fileInputRef}
          className="image-hidden-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf"
          onChange={handleFileChange}
          onClick={(event) => event.stopPropagation()}
        />
        <strong>点击上传、拖拽图片到此处，或直接粘贴截图</strong>
        <span>支持 PNG / JPG / JPEG / WEBP。默认使用图片辅助重绘，识别结果请人工校对。</span>
        {file && <em>当前图片：{file.name || '未命名截图'}</em>}
      </div>

      <div className="ocr-method-panel" aria-label="当前模式">
        <strong>当前模式</strong>
        <div className="ocr-mode-options">
          <label><input type="radio" name="recognition-method" checked={recognitionMethod === IMPORT_METHODS.ASSIST} onChange={() => setRecognitionMethod(IMPORT_METHODS.ASSIST)} /> 图片辅助重绘（推荐）</label>
          <label><input type="radio" name="recognition-method" checked={recognitionMethod === IMPORT_METHODS.OCR} onChange={() => setRecognitionMethod(IMPORT_METHODS.OCR)} /> 本地 OCR 备用</label>
          <label><input type="radio" name="recognition-method" checked={recognitionMethod === IMPORT_METHODS.AI} onChange={() => setRecognitionMethod(IMPORT_METHODS.AI)} /> AI 识图（高级可选）</label>
        </div>
        <p>{recognitionMethod === IMPORT_METHODS.ASSIST ? '推荐：上传参考图后，框选节点区域，可局部识别或手动输入文字，再添加为阶段、节点或子节点。' : recognitionMethod === IMPORT_METHODS.AI ? 'AI 识图为高级功能，需要 API 额度。额度不足时可使用图片辅助重绘模式。' : '本地 OCR 作为备用能力，整图识别、自动分块和前处理选项已放入高级识别设置。'}</p>
      </div>

      <p className="pdf-import-tip">PDF 识别功能即将支持。当前建议先将 PDF 中的流程图截图后粘贴或上传。</p>

      {recognitionMethod === IMPORT_METHODS.ASSIST && (
        <div className="assist-redraw-layout">
          <div className="assist-reference-panel">
            <div className="assist-toolbar">
              <strong>参考图操作</strong>
              <button type="button" className={assistTool === 'select' ? 'is-active' : ''} onClick={() => setAssistTool('select')} disabled={!file}>框选区域</button>
              <button type="button" onClick={recognizeAssistSelection} disabled={!file || !manualSelection || isRecognizing}>识别选区文字</button>
              <button type="button" onClick={() => setManualSelection(null)} disabled={!manualSelection || isRecognizing}>清除选区</button>
              <button type="button" onClick={handleRemoveImage} disabled={!file || isRecognizing || isAiRecognizing}>移除当前图片</button>
            </div>
            <div className="assist-toolbar assist-view-toolbar" aria-label="参考图视图工具">
              <span>视图：</span>
              <button type="button" onClick={() => setAssistZoom('fit')}>适应宽度</button>
              <button type="button" onClick={() => setAssistZoom('100')}>100%</button>
              <button type="button" onClick={() => setAssistZoom((current) => String(Math.min(2.5, (Number(current) || 1) + 0.2)))}>放大</button>
              <button type="button" onClick={() => setAssistZoom((current) => String(Math.max(0.4, (Number(current) || 1) - 0.2)))}>缩小</button>
              <button type="button" className={assistTool === 'pan' ? 'is-active' : ''} onClick={() => setAssistTool('pan')} disabled={!file}>拖拽平移</button>
            </div>
            {previewUrl ? (
              <div
                className={`assist-image-box ${assistTool === 'pan' ? 'is-pan-mode' : ''} ${isPanning ? 'is-panning' : ''}`}
                onPointerDown={handleAssistPanStart}
                onPointerMove={handleAssistPanMove}
                onPointerUp={handleAssistPanEnd}
                onPointerLeave={handleAssistPanEnd}
              >
                <div className="image-preview-stage assist-image-stage">
                  <img
                    ref={imagePreviewRef}
                    src={previewUrl}
                    alt="图片辅助重绘参考图"
                    style={{ width: assistZoom === 'fit' ? '100%' : assistZoom === '100' ? `${imageNaturalSize.width || 900}px` : `${Math.round((imageNaturalSize.width || 900) * Number(assistZoom || 1))}px`, maxWidth: assistZoom === 'fit' ? '100%' : 'none', maxHeight: 'none' }}
                    onLoad={(event) => setImageNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                  />
                  <ImageSelectionOverlay
                    imgRef={imagePreviewRef}
                    enabled={assistTool === 'select' && !isRecognizing && !isAiRecognizing}
                    selection={manualSelection}
                    onSelectionChange={setManualSelection}
                    boxes={[]}
                    naturalSize={imageNaturalSize}
                  />
                </div>
              </div>
            ) : (
              <div className="assist-empty-reference">请先上传或粘贴参考图。</div>
            )}
          </div>

          <div className="assist-side-panel">
            <div className={`assist-selection-panel ${manualSelection ? 'has-selection' : ''}`}>
              <div className="assist-selection-summary">
                <strong>选区文字处理</strong>
                <span>选区：{manualSelection ? `x=${manualSelection.x}, y=${manualSelection.y}, w=${manualSelection.width}, h=${manualSelection.height}` : '尚未框选'}</span>
              </div>
              {!manualSelection && <p className="assist-empty-draft">请先框选图片中的节点区域；也可以直接在下方手动输入文字后添加。</p>}
              <label className="field-label">识别 / 输入结果
                <textarea className="structured-editor assist-selection-text" value={assistSelectionText} onChange={(event) => setAssistSelectionText(event.target.value)} placeholder="局部 OCR 会自动填入这里；也可以直接手动输入或修改节点文字。" />
              </label>
              <div className="button-row compact assist-selection-actions">
                <button type="button" onClick={recognizeAssistSelection} disabled={!file || !manualSelection || isRecognizing}>识别选区文字</button>
                <button type="button" onClick={() => addAssistDraftNode(ASSIST_NODE_TYPES.STAGE)}>添加为阶段</button>
                <button type="button" onClick={() => addAssistDraftNode(ASSIST_NODE_TYPES.NODE)}>添加为节点</button>
                <button type="button" onClick={() => addAssistDraftNode(ASSIST_NODE_TYPES.CHILD)}>添加为子节点</button>
                <button type="button" onClick={() => addAssistDraftNode(ASSIST_NODE_TYPES.CAPTION)}>添加为图题</button>
                <button type="button" onClick={() => setAssistSelectionText('')} disabled={!assistSelectionText.trim()}>清空选区文字</button>
              </div>
            </div>

            <div className="assist-draft-panel">
              <div className="assist-draft-heading">
                <strong>节点草稿区</strong>
                <span>{draftNodes.length} 项</span>
              </div>
              <div className="assist-draft-list">
                {draftNodes.length ? draftNodes.map((node, index) => (
                  <article className="assist-draft-item" key={node.id}>
                    <select value={node.type} onChange={(event) => updateDraftNode(node.id, { type: event.target.value })} aria-label="节点类型">
                      {Object.entries(ASSIST_NODE_LABELS).map(([type, label]) => <option value={type} key={type}>{label}</option>)}
                    </select>
                    <textarea value={node.text} onChange={(event) => updateDraftNode(node.id, { text: event.target.value })} aria-label="节点文字" />
                    <div className="assist-draft-actions">
                      <button type="button" onClick={() => moveDraftNode(node.id, -1)} disabled={index === 0}>上移</button>
                      <button type="button" onClick={() => moveDraftNode(node.id, 1)} disabled={index === draftNodes.length - 1}>下移</button>
                      <button type="button" onClick={() => removeDraftNode(node.id)}>删除</button>
                    </div>
                  </article>
                )) : <p className="assist-empty-draft">节点草稿为空。请框选参考图并添加为阶段、节点或子节点。</p>}
              </div>
              <div className="button-row compact assist-apply-actions">
                <button type="button" className="primary" onClick={generateAssistStructuredText}>生成结构化文本</button>
                <button type="button" onClick={applyAssistStructuredText} disabled={!draftNodes.length && !resultText.trim()}>应用到当前流程</button>
                <button type="button" onClick={() => { setDraftNodes([]); setStatus('已清空节点草稿。') }} disabled={!draftNodes.length}>清空草稿</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {recognitionMethod !== IMPORT_METHODS.ASSIST && previewUrl && (
        <div className="image-preview-box">
          <div className="image-preview-stage">
            <img
              ref={imagePreviewRef}
              src={previewUrl}
              alt="上传的流程图预览"
              onLoad={(event) => setImageNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            />
            <ImageSelectionOverlay
              imgRef={imagePreviewRef}
              enabled={recognitionMethod === IMPORT_METHODS.OCR && recognitionMode === RECOGNITION_MODES.MANUAL && !isRecognizing && !isAiRecognizing}
              selection={manualSelection}
              onSelectionChange={setManualSelection}
              boxes={recognitionMethod === IMPORT_METHODS.OCR && recognitionMode === RECOGNITION_MODES.SEGMENTED ? detectedBoxes : []}
              naturalSize={imageNaturalSize}
            />
          </div>
        </div>
      )}

      <details className="ocr-raw-text-panel advanced-recognition-panel">
        <summary>高级识别设置</summary>
        <p className="advanced-help">AI 识图为高级功能，需要 API 额度。额度不足时可使用图片辅助重绘模式。本地 OCR 整图识别、自动分块识别、检测流程框和 OCR 前处理选项均保留在此处。</p>

        {recognitionMethod === IMPORT_METHODS.AI && (
          <div className="button-row compact image-import-actions">
            <button type="button" className="primary" onClick={handleAiRecognize} disabled={!file || isAiRecognizing || isRecognizing}>
              {isAiRecognizing ? 'AI 识图中…' : 'AI 识图生成'}
            </button>
          </div>
        )}

        {recognitionMethod === IMPORT_METHODS.OCR && <div className="ocr-mode-panel" aria-label="本地 OCR 识别模式">
          <strong>本地 OCR 识别模式</strong>
          <div className="ocr-mode-options">
            <label><input type="radio" name="ocr-mode" checked={recognitionMode === RECOGNITION_MODES.FULL} onChange={() => setRecognitionMode(RECOGNITION_MODES.FULL)} /> 整图识别</label>
            <label><input type="radio" name="ocr-mode" checked={recognitionMode === RECOGNITION_MODES.SEGMENTED} onChange={() => setRecognitionMode(RECOGNITION_MODES.SEGMENTED)} /> 自动分块识别</label>
            <label><input type="radio" name="ocr-mode" checked={recognitionMode === RECOGNITION_MODES.MANUAL} onChange={() => setRecognitionMode(RECOGNITION_MODES.MANUAL)} /> 手动框选识别</label>
          </div>
          <div className="button-row compact image-import-actions">
            <button type="button" onClick={() => handleRecognize(false)} disabled={!file || isRecognizing || isDetecting || isAiRecognizing}>本地 OCR 识别</button>
            <button type="button" onClick={() => detectBoxes()} disabled={!file || isRecognizing || isDetecting || isAiRecognizing}>检测流程框</button>
            <button type="button" onClick={() => handleRecognize(true)} disabled={!file || isRecognizing || isDetecting || isAiRecognizing}>重新 OCR</button>
            <button type="button" onClick={() => setManualSelection(null)} disabled={!manualSelection || isRecognizing}>清除选区</button>
          </div>
        </div>}

        {recognitionMethod === IMPORT_METHODS.OCR && <div className="ocr-preprocess-panel" aria-label="OCR 前处理选项">
          <strong>OCR 前处理选项</strong>
          <div className="ocr-preprocess-options">
            <label><input type="checkbox" checked={preprocessOptions.enhanceContrast && !preprocessOptions.useOriginal} onChange={updatePreprocessOption('enhanceContrast')} disabled={preprocessOptions.useOriginal} /> 自动增强对比度</label>
            <label><input type="checkbox" checked={preprocessOptions.grayscale && !preprocessOptions.useOriginal} onChange={updatePreprocessOption('grayscale')} disabled={preprocessOptions.useOriginal} /> 灰度化</label>
            <label><input type="checkbox" checked={preprocessOptions.autoCrop && !preprocessOptions.useOriginal} onChange={updatePreprocessOption('autoCrop')} disabled={preprocessOptions.useOriginal} /> 自动裁剪空白边</label>
            <label><input type="checkbox" checked={preprocessOptions.upscale && !preprocessOptions.useOriginal} onChange={updatePreprocessOption('upscale')} disabled={preprocessOptions.useOriginal} /> 放大后识别</label>
            <label><input type="checkbox" checked={preprocessOptions.useOriginal} onChange={updatePreprocessOption('useOriginal')} /> 使用原图识别</label>
          </div>
        </div>}

        {status === AI_QUOTA_FALLBACK_MESSAGE && <button type="button" className="primary" onClick={() => setRecognitionMethod(IMPORT_METHODS.ASSIST)}>切换到图片辅助重绘</button>}
      </details>

      {preprocessNotes.length > 0 && (
        <div className="preprocess-note-list">
          {preprocessNotes.map((note) => <span key={note}>{note}</span>)}
        </div>
      )}

      {recognitionMethod !== IMPORT_METHODS.ASSIST && (
        <div className="button-row compact image-import-actions">
          <button type="button" onClick={handleApply} disabled={!resultText.trim() || isRecognizing || isAiRecognizing}>应用到当前流程</button>
          <button type="button" onClick={handleRemoveImage} disabled={!file || isRecognizing || isAiRecognizing}>移除当前图片</button>
        </div>
      )}

      {status && (
        <div className="ocr-status" role="status">
          <span>{status}</span>
          {(isRecognizing || isAiRecognizing) && <strong>{progress}%</strong>}
        </div>
      )}

      <label className="field-label">
        {recognitionMethod === IMPORT_METHODS.ASSIST ? '图片辅助重绘结构化结果编辑' : 'AI / OCR 结构化结果编辑'}
        <textarea
          className="structured-editor ocr-result-editor"
          value={resultText}
          onChange={(event) => setResultText(event.target.value)}
          placeholder={'识别完成后会生成结构化节点文本，例如：\n阶段一：进场准备阶段\n* 收到中标通知书\n* 入驻现场'}
        />
      </label>


      {(aiResult || rawOcrText.trim() || segmentDetails.length > 0 || detectedBoxes.length > 0 || recognizedLineCount > 0 || qualityHint) && (
        <details className="ocr-raw-text-panel debug-ocr-panel">
          <summary>调试与原始 OCR 结果</summary>
          <div className="ocr-debug-summary">
            <span>当前识别方式：{recognitionMethod === IMPORT_METHODS.AI ? 'AI 识图' : recognitionMethod === IMPORT_METHODS.ASSIST ? '图片辅助重绘' : (recognitionMode === RECOGNITION_MODES.FULL ? '本地 OCR / 整图识别' : recognitionMode === RECOGNITION_MODES.SEGMENTED ? '本地 OCR / 自动分块识别' : '本地 OCR / 手动框选识别')}</span>
            <span>识别框数量：{detectedBoxes.length}</span>
            <span>识别节点数量：{recognizedLineCount}</span>
            {qualityHint && <span className="quality-hint">识别质量提示：{qualityHint}</span>}
          </div>

          {aiResult && (
            <div className="ai-result-panel">
              <strong>AI 识图结果</strong>
              <div className="ai-result-grid">
                <span>图号：{aiResult.figureNumber || '未识别'}</span>
                <span>图题：{aiResult.figureTitle || '未识别'}</span>
                <span>图类型：{aiResult.diagramKind || '普通流程图'}</span>
                <span>模板：{aiResult.templateType || 'basic'}</span>
              </div>
              {aiWarnings.length > 0 && (
                <ul className="ai-warning-list">
                  {aiWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              )}
            </div>
          )}

          {rawOcrText.trim() && (
            <div className="raw-ocr-block">
              <strong>查看 OCR 原始文本</strong>
              <textarea
                className="structured-editor ocr-raw-text"
                value={rawOcrText}
                readOnly
                aria-label="OCR 原始文本"
              />
              <span>原始文本仅用于核对，不会自动应用到当前流程。</span>
            </div>
          )}

          {segmentDetails.length > 0 && (
            <div className="segmented-detail-panel">
              <strong>查看分块识别详情</strong>
              <div className="segmented-detail-list">
                {segmentDetails.map((detail) => (
                  <article key={detail.index}>
                    <strong>第 {detail.index} 个框（{detail.type || 'node'}）</strong>
                    <span>位置：x={detail.box.x}, y={detail.box.y}, w={detail.box.width}, h={detail.box.height}</span>
                    {detail.error && <em>错误：{detail.error}</em>}
                    <label>原始 OCR 文本<textarea className="structured-editor ocr-raw-text" value={detail.rawText || ''} readOnly /></label>
                    <label>清洗后文本<textarea className="structured-editor ocr-raw-text" value={detail.cleanText || ''} readOnly /></label>
                  </article>
                ))}
              </div>
            </div>
          )}
        </details>
      )}

      {recognizedLineCount > 0 && recognizedLineCount < 3 && (
        <p className="ocr-quality-warning">识别结果较少，建议手动框选关键区域，或手动补充节点。</p>
      )}
    </section>
  )
}

export default ImageImportPanel
