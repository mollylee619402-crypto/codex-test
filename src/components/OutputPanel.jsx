import MermaidPreview from './MermaidPreview'
import ReportSvgPreview from './ReportSvgPreview'
import { EXPORT_SIZE_PRESETS, REPORT_SVG_NOTICE } from '../utils/reportDiagramTemplates.js'

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
  pngScale = 3,
  setPngScale,
  pngScaleOptions = [],
  onDownloadPptx,
  onDownloadMermaid,
  onResetExample,
  feedback,
  onSvgReady,
  reportSvg = '',
  isReportSvg = false,
  exportSize = 'word-page',
  setExportSize,
  collapsed = false,
  onToggleCollapsed
}) {
  return (
    <section className={`panel output-panel ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="panel-heading output-heading">
        <div>
          <h2>输出与预览</h2>
          {feedback && <span className="feedback">{feedback}</span>}
        </div>
        <button type="button" className="preview-toggle-button" onClick={onToggleCollapsed}>
          {collapsed ? '展开预览' : '收起预览'}
        </button>
      </div>

      <div className="metadata-card compact-metadata-card">
        <p className="caption">{metadata.caption}</p>
        {!collapsed && <p>{metadata.description}</p>}
        {collapsed && <p className="collapsed-status">{feedback || '预览已收起，生成后可展开查看。'}</p>}
      </div>

      <div className="export-options-row compact-export-options">
        <label className="field-label export-size-field">
          导出尺寸
          <select value={exportSize} onChange={(event) => setExportSize?.(event.target.value)}>
            {Object.entries(EXPORT_SIZE_PRESETS).map(([value, preset]) => <option key={value} value={value}>{preset.label}</option>)}
          </select>
        </label>

        <label className="field-label export-size-field">
          PNG 倍率
          <select value={pngScale} onChange={(event) => setPngScale?.(Number(event.target.value))}>
            {pngScaleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {isReportSvg && !collapsed && <span className="export-option-tip">报告版模板默认使用超清 3x。</span>}
        </label>
      </div>

      <div className="export-toolbar" aria-label="导出工具栏">
        <button type="button" onClick={onDownloadSvg}>下载 SVG</button>
        <button type="button" onClick={onDownloadPng} disabled={isPngExporting}>{pngButtonLabel}</button>
        <button type="button" onClick={onDownloadPptx}>下载 PPTX 可编辑版</button>
        <button type="button" onClick={onCopyMetadata}>复制图题与说明</button>
        <button type="button" onClick={onDownloadMermaid}>下载 Mermaid 源码</button>
        <details className="more-export-options">
          <summary>更多导出选项</summary>
          <div>
            <button type="button" className="primary" onClick={onCopyCode}>复制 Mermaid 代码</button>
            <button type="button" onClick={onCopyPrompt}>复制提示词</button>
            <button type="button" onClick={onResetExample}>重置示例</button>
          </div>
        </details>
      </div>

      {!collapsed && (
        <>
          <details className="mermaid-code-details">
            <summary>Mermaid 代码（点击展开）</summary>
            <textarea
              id="mermaid-code"
              className="code-area"
              value={mermaidCode}
              onChange={(event) => setMermaidCode(event.target.value)}
              spellCheck="false"
            />
          </details>

          <div className="preview-section">
            <h3>{isReportSvg ? '报告版 SVG 预览' : '流程图实时预览区'}</h3>
            {isReportSvg && <p className="report-svg-tip">{REPORT_SVG_NOTICE}</p>}
            {isReportSvg
              ? <ReportSvgPreview svg={reportSvg} onSvgReady={onSvgReady} />
              : <MermaidPreview code={mermaidCode} onSvgReady={onSvgReady} />}
          </div>

          <details className="summary-section compact-summary-section">
            <summary>流程说明区（点击展开）</summary>
            <div className="metadata-text">{metadataText}</div>
            <ul>
              {summary.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </details>
        </>
      )}
    </section>
  )
}

export default OutputPanel
