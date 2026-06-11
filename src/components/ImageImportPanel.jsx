import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupportedImageHint, isSupportedImageFile } from '../utils/imageOcrSupport.js'
import { clipboardSupportsFiles, getImageFileFromClipboard, isEditablePasteTarget } from '../utils/clipboardImage.js'
import { getFirstSupportedDraggedImage } from '../utils/dragDropImage.js'
import { ocrToStructuredInput } from '../utils/ocrToStructuredInput.js'
import ImageSelectionOverlay from './ImageSelectionOverlay.jsx'

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

function isPdfFile(file) {
  return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '')
}

function ImageImportPanel({ onApply, onDetectedCaption }) {
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
  const [recognitionMode, setRecognitionMode] = useState(RECOGNITION_MODES.FULL)
  const [detectedBoxes, setDetectedBoxes] = useState([])
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [manualSelection, setManualSelection] = useState(null)
  const [segmentDetails, setSegmentDetails] = useState([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [qualityHint, setQualityHint] = useState('')
  const imagePreviewRef = useRef(null)
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)
  const dragDepthRef = useRef(0)

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
      setStatus(`请先上传图片。${getSupportedImageHint()}`)
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
      setStatus(`请先上传图片。${getSupportedImageHint()}`)
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
      setStatus(message.includes('OCR 模块加载失败') || message.includes('初始化') ? message : 'OCR 失败，请检查图片清晰度')
    } finally {
      setIsRecognizing(false)
    }
  }

  const handleApply = () => {
    if (!resultText.trim()) {
      setStatus('未识别到有效文字，暂无可应用内容。')
      return
    }
    onApply(resultText.trim())
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
        <span>上传已有流程图，OCR 识别后生成可编辑节点</span>
      </div>

      <p className="image-import-tip">
        识别效果受图片清晰度、文字大小、遮挡、复杂连线和排版影响。建议上传清晰截图，识别后请人工校对。
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
        <span>支持 PNG / JPG / JPEG / WEBP，建议上传清晰截图，识别后请人工校对。</span>
        {file && <em>当前图片：{file.name || '未命名截图'}</em>}
      </div>

      <p className="pdf-import-tip">PDF 识别功能即将支持。当前建议先将 PDF 中的流程图截图后粘贴或上传。</p>

      <div className="ocr-mode-panel" aria-label="识别模式">
        <strong>识别模式</strong>
        <div className="ocr-mode-options">
          <label><input type="radio" name="ocr-mode" checked={recognitionMode === RECOGNITION_MODES.FULL} onChange={() => setRecognitionMode(RECOGNITION_MODES.FULL)} /> 整图识别</label>
          <label><input type="radio" name="ocr-mode" checked={recognitionMode === RECOGNITION_MODES.SEGMENTED} onChange={() => setRecognitionMode(RECOGNITION_MODES.SEGMENTED)} /> 自动分块识别</label>
          <label><input type="radio" name="ocr-mode" checked={recognitionMode === RECOGNITION_MODES.MANUAL} onChange={() => setRecognitionMode(RECOGNITION_MODES.MANUAL)} /> 手动框选识别</label>
        </div>
      </div>

      <div className="ocr-preprocess-panel" aria-label="OCR 前处理选项">
        <strong>OCR 前处理</strong>
        <div className="ocr-preprocess-options">
          <label><input type="checkbox" checked={preprocessOptions.enhanceContrast && !preprocessOptions.useOriginal} onChange={updatePreprocessOption('enhanceContrast')} disabled={preprocessOptions.useOriginal} /> 自动增强对比度</label>
          <label><input type="checkbox" checked={preprocessOptions.grayscale && !preprocessOptions.useOriginal} onChange={updatePreprocessOption('grayscale')} disabled={preprocessOptions.useOriginal} /> 灰度化</label>
          <label><input type="checkbox" checked={preprocessOptions.autoCrop && !preprocessOptions.useOriginal} onChange={updatePreprocessOption('autoCrop')} disabled={preprocessOptions.useOriginal} /> 自动裁剪空白边</label>
          <label><input type="checkbox" checked={preprocessOptions.upscale && !preprocessOptions.useOriginal} onChange={updatePreprocessOption('upscale')} disabled={preprocessOptions.useOriginal} /> 放大后识别</label>
          <label><input type="checkbox" checked={preprocessOptions.useOriginal} onChange={updatePreprocessOption('useOriginal')} /> 使用原图识别</label>
        </div>
      </div>

      {previewUrl && (
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
              enabled={recognitionMode === RECOGNITION_MODES.MANUAL && !isRecognizing}
              selection={manualSelection}
              onSelectionChange={setManualSelection}
              boxes={recognitionMode === RECOGNITION_MODES.SEGMENTED ? detectedBoxes : []}
              naturalSize={imageNaturalSize}
            />
          </div>
          <div className="ocr-debug-summary">
            <span>当前识别模式：{recognitionMode === RECOGNITION_MODES.FULL ? '整图识别' : recognitionMode === RECOGNITION_MODES.SEGMENTED ? '自动分块识别' : '手动框选识别'}</span>
            <span>检测到的流程框数量：{detectedBoxes.length}</span>
            <span>已识别节点数量：{recognizedLineCount}</span>
            {qualityHint && <span className="quality-hint">识别质量提示：{qualityHint}</span>}
          </div>
        </div>
      )}

      {preprocessNotes.length > 0 && (
        <div className="preprocess-note-list">
          {preprocessNotes.map((note) => <span key={note}>{note}</span>)}
        </div>
      )}

      <div className="button-row compact image-import-actions">
        <button type="button" onClick={() => detectBoxes()} disabled={!file || isRecognizing || isDetecting}>检测流程框</button>
        <button type="button" className="primary" onClick={() => handleRecognize(false)} disabled={!file || isRecognizing || isDetecting}>
          {isRecognizing ? '正在识别…' : '开始识别'}
        </button>
        <button type="button" onClick={() => handleRecognize(true)} disabled={!file || isRecognizing || isDetecting}>重新识别</button>
        <button type="button" onClick={() => setManualSelection(null)} disabled={!manualSelection || isRecognizing}>清除选区</button>
        <button type="button" onClick={handleApply} disabled={!resultText.trim() || isRecognizing}>应用到当前流程</button>
        <button type="button" onClick={handleRemoveImage} disabled={!file || isRecognizing}>移除当前图片</button>
      </div>

      {status && (
        <div className="ocr-status" role="status">
          <span>{status}</span>
          {isRecognizing && <strong>{progress}%</strong>}
        </div>
      )}

      <label className="field-label">
        清洗后的结构化结果编辑
        <textarea
          className="structured-editor ocr-result-editor"
          value={resultText}
          onChange={(event) => setResultText(event.target.value)}
          placeholder={'识别完成后会生成结构化节点文本，例如：\n阶段一：进场准备阶段\n* 收到中标通知书\n* 入驻现场'}
        />
      </label>

      {rawOcrText.trim() && (
        <details className="ocr-raw-text-panel">
          <summary>查看 OCR 原始文本</summary>
          <textarea
            className="structured-editor ocr-raw-text"
            value={rawOcrText}
            readOnly
            aria-label="OCR 原始文本"
          />
          <span>原始文本仅用于核对，不会自动应用到当前流程。</span>
        </details>
      )}

      {segmentDetails.length > 0 && (
        <details className="ocr-raw-text-panel segmented-detail-panel">
          <summary>查看分块识别详情</summary>
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
        </details>
      )}

      {recognizedLineCount > 0 && recognizedLineCount < 3 && (
        <p className="ocr-quality-warning">识别结果较少，建议手动框选关键区域，或手动补充节点。</p>
      )}
    </section>
  )
}

export default ImageImportPanel
