import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupportedImageHint, isSupportedImageFile, recognizeImageText } from '../utils/imageOcr.js'
import { clipboardSupportsFiles, getImageFileFromClipboard, isEditablePasteTarget } from '../utils/clipboardImage.js'
import { getFirstSupportedDraggedImage } from '../utils/dragDropImage.js'
import { ocrToStructuredInput } from '../utils/ocrToStructuredInput.js'

const DEFAULT_PREPROCESS_OPTIONS = {
  enhanceContrast: true,
  grayscale: false,
  autoCrop: true,
  upscale: true,
  useOriginal: false
}

function isPdfFile(file) {
  return file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name || '')
}

function ImageImportPanel({ onApply }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [resultText, setResultText] = useState('')
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isPointerInDropZone, setIsPointerInDropZone] = useState(false)
  const [preprocessOptions, setPreprocessOptions] = useState(DEFAULT_PREPROCESS_OPTIONS)
  const [preprocessNotes, setPreprocessNotes] = useState([])
  const [qualityHints, setQualityHints] = useState([])
  const [lastCaption, setLastCaption] = useState(null)
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
    setProgress(0)
    setPreprocessNotes([])
    setQualityHints([])
    setLastCaption(null)
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

  const handleRecognize = async (isRetry = false) => {
    if (!file) {
      setStatus(`请先上传图片。${getSupportedImageHint()}`)
      return
    }

    setIsRecognizing(true)
    setProgress(0)
    setPreprocessNotes([])
    setQualityHints([])
    setLastCaption(null)
    setResultText('')
    setStatus(isRetry ? '正在重新识别文字' : '正在初始化 OCR…')

    try {
      const ocrResult = await recognizeImageText(file, {
        preprocessOptions,
        onPreprocess: ({ status: nextStatus, notes }) => {
          setStatus(nextStatus || '正在预处理图片')
          setPreprocessNotes(notes || [])
        },
        onProgress: ({ status: nextStatus, progress: nextProgress }) => {
          setStatus(nextStatus || '正在识别文字')
          setProgress(nextProgress || 0)
        }
      })
      const structuredResult = ocrToStructuredInput(ocrResult)
      setQualityHints(structuredResult.quality || [])
      setLastCaption(structuredResult.caption || null)
      if (!structuredResult.text.trim()) {
        setResultText('')
        setStatus('OCR 识别失败：未识别到有效文字，请重新上传更清晰图片或手动输入。')
        return
      }
      setResultText(structuredResult.text)
      const suffix = structuredResult.quality?.length ? ` ${structuredResult.quality[0]}` : ''
      setStatus(`${isRetry ? '识别结果已更新。' : '识别完成'}${suffix}`)
      setProgress(100)
    } catch (error) {
      console.error('[FlowCraft OCR] error', error)
      const message = error?.message || 'OCR 识别失败：请检查图片清晰度'
      setResultText('')
      setQualityHints(['识别失败，请重新上传更清晰图片或手动输入。'])
      setStatus(message.includes('OCR') ? message : `OCR 识别失败：${message}`)
    } finally {
      setIsRecognizing(false)
    }
  }

  const handleApply = () => {
    if (!resultText.trim()) {
      setStatus('未识别到有效文字，暂无可应用内容。')
      return
    }
    onApply({ text: resultText.trim(), caption: lastCaption })
    setStatus('识别结果已应用到当前流程。')
  }

  const handleRemoveImage = () => {
    setFile(null)
    setResultText('')
    setStatus('已移除当前图片')
    setProgress(0)
    setPreprocessNotes([])
    setQualityHints([])
    setLastCaption(null)
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
          <img src={previewUrl} alt="上传的流程图预览" />
        </div>
      )}

      {preprocessNotes.length > 0 && (
        <div className="preprocess-note-list">
          {preprocessNotes.map((note) => <span key={note}>{note}</span>)}
        </div>
      )}

      {qualityHints.length > 0 && (
        <div className="preprocess-note-list">
          {qualityHints.map((hint) => <span key={hint}>{hint}</span>)}
        </div>
      )}

      <div className="button-row compact image-import-actions">
        <button type="button" className="primary" onClick={() => handleRecognize(false)} disabled={!file || isRecognizing}>
          {isRecognizing ? '正在识别…' : '开始识别'}
        </button>
        <button type="button" onClick={() => handleRecognize(true)} disabled={!file || isRecognizing}>重新识别</button>
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
        识别结果编辑
        <textarea
          className="structured-editor ocr-result-editor"
          value={resultText}
          onChange={(event) => setResultText(event.target.value)}
          placeholder={'识别完成后会生成结构化节点文本。OCR 失败时不会自动填入默认示例，请重新上传更清晰图片或手动输入。'}
        />
      </label>
    </section>
  )
}

export default ImageImportPanel
