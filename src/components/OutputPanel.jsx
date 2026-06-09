import MermaidPreview from './MermaidPreview'
import ReportSvgPreview from './ReportSvgPreview'
import { REPORT_SVG_NOTICE } from '../utils/reportDiagramTemplates.js'

function OutputPanel({
  mermaidCode,
  setMermaidCode,
  summary,
  metadata,
  metadataText,
  onCopyCode,
  onCopyPrompt,
  onCopyMetadata,
  onDownloadSvg,
  onDownloadPng,
  isPngExporting,
  pngButtonLabel,
  onDownloadPptx,
  onDownloadMermaid,
  onResetExample,
  feedback,
  onSvgReady,
  reportSvg = '',
  isReportSvg = false
}) {
  return (
    <section className="panel output-panel">
      <div className="panel-heading">
        <h2>输出与预览</h2>
        {feedback && <span className="feedback">{feedback}</span>}
      </div>

      <div className="metadata-card">
        <p className="caption">{metadata.caption}</p>
        <p>{metadata.description}</p>
      </div>

      <label className="field-label" htmlFor="mermaid-code">Mermaid 代码输出区</label>
      <textarea
        id="mermaid-code"
        className="code-area"
        value={mermaidCode}
        onChange={(event) => setMermaidCode(event.target.value)}
        spellCheck="false"
      />

      <div className="export-toolbar" aria-label="导出工具栏">
        <button type="button" className="primary" onClick={onCopyCode}>复制 Mermaid 代码</button>
        <button type="button" onClick={onDownloadSvg}>下载 SVG</button>
        <button type="button" onClick={onDownloadPng} disabled={isPngExporting}>{pngButtonLabel}</button>
        <button type="button" onClick={onDownloadPptx}>下载 PPTX 可编辑版</button>
        <button type="button" onClick={onDownloadMermaid}>下载 Mermaid 源码</button>
        <button type="button" onClick={onCopyMetadata}>复制图题与说明</button>
        <button type="button" onClick={onCopyPrompt}>复制提示词</button>
        <button type="button" onClick={onResetExample}>重置示例</button>
      </div>

      <div className="preview-section">
        <h3>{isReportSvg ? '报告版 SVG 预览' : '流程图实时预览区'}</h3>
        {isReportSvg && <p className="report-svg-tip">{REPORT_SVG_NOTICE}</p>}
        {isReportSvg
          ? <ReportSvgPreview svg={reportSvg} onSvgReady={onSvgReady} />
          : <MermaidPreview code={mermaidCode} onSvgReady={onSvgReady} />}
      </div>

      <div className="summary-section">
        <h3>流程说明区</h3>
        <div className="metadata-text">{metadataText}</div>
        <ul>
          {summary.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </section>
  )
}

export default OutputPanel
