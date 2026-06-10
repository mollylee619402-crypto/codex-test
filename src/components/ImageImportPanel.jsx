import { useEffect, useRef, useState } from 'react'
import { getSupportedImageHint, isSupportedImageFile, recognizeImageText } from '../utils/imageOcr.js'
import { ocrToStructuredInput } from '../utils/ocrToStructuredInput.js'

function ImageImportPanel({ onApply }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [resultText, setResultText] = useState('')
  const [isRecognizing, setIsRecognizing] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return

    if (!isSupportedImageFile(nextFile)) {
      setFile(null)
      setResultText('')
      setProgress(0)
      setStatus(`图片格式不支持。${getSupportedImageHint()}`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(nextFile)
    setPreviewUrl(URL.createObjectURL(nextFile))
    setResultText('')
    setProgress(0)
    setStatus('图片上传成功')
  }

  const handleRecognize = async () => {
    if (!file) {
      setStatus(`请先上传图片。${getSupportedImageHint()}`)
      return
    }

    setIsRecognizing(true)
    setProgress(0)
    setStatus('正在识别文字')

    try {
      const ocrResult = await recognizeImageText(file, {
        onProgress: ({ status: nextStatus, progress: nextProgress }) => {
          setStatus(nextStatus || '正在识别文字')
          setProgress(nextProgress || 0)
        }
      })
      const structuredResult = ocrToStructuredInput(ocrResult)
      if (!structuredResult.text.trim()) {
        setResultText('')
        setStatus('未识别到有效文字，请尝试上传更清晰的图片。')
        return
      }
      setResultText(structuredResult.text)
      setStatus('识别完成，请校对后应用到当前流程。')
      setProgress(100)
    } catch (error) {
      const message = error?.message || '请检查图片清晰度或稍后重试。'
      setStatus(message.includes('初始化') ? message : `OCR 失败：${message}`)
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
    setStatus('已应用到当前流程')
  }

  const handleClear = () => {
    setFile(null)
    setResultText('')
    setStatus('识别结果已清空')
    setProgress(0)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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

      <label className="field-label image-upload-field">
        上传流程图图片
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
          onChange={handleFileChange}
        />
      </label>

      {previewUrl && (
        <div className="image-preview-box">
          <img src={previewUrl} alt="上传的流程图预览" />
        </div>
      )}

      <div className="button-row compact image-import-actions">
        <button type="button" className="primary" onClick={handleRecognize} disabled={!file || isRecognizing}>
          {isRecognizing ? '正在识别…' : '开始识别'}
        </button>
        <button type="button" onClick={handleApply} disabled={!resultText.trim() || isRecognizing}>应用到当前流程</button>
        <button type="button" onClick={handleClear} disabled={isRecognizing}>清空识别结果</button>
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
          placeholder={'识别完成后会生成结构化节点文本，例如：\n阶段一：进场准备阶段\n* 收到中标通知书\n* 入驻现场'}
        />
      </label>
    </section>
  )
}

export default ImageImportPanel
