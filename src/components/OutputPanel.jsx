import MermaidPreview from './MermaidPreview'

function OutputPanel({ mermaidCode, setMermaidCode, summary, onCopyCode, onCopyPrompt, onDownloadSvg, onResetExample, feedback, onSvgReady }) {
  return (
    <section className="panel output-panel">
      <div className="panel-heading">
        <h2>输出与预览</h2>
        {feedback && <span className="feedback">{feedback}</span>}
      </div>

      <label className="field-label" htmlFor="mermaid-code">Mermaid 代码输出区</label>
      <textarea
        id="mermaid-code"
        className="code-area"
        value={mermaidCode}
        onChange={(event) => setMermaidCode(event.target.value)}
        spellCheck="false"
      />

      <div className="button-row compact">
        <button type="button" className="primary" onClick={onCopyCode}>复制 Mermaid 代码</button>
        <button type="button" onClick={onDownloadSvg}>下载 SVG</button>
        <button type="button" onClick={onCopyPrompt}>复制提示词</button>
        <button type="button" onClick={onResetExample}>重置示例</button>
      </div>

      <div className="preview-section">
        <h3>流程图实时预览区</h3>
        <MermaidPreview code={mermaidCode} onSvgReady={onSvgReady} />
      </div>

      <div className="summary-section">
        <h3>流程说明区</h3>
        <ul>
          {summary.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </section>
  )
}

export default OutputPanel
