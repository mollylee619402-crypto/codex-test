import { DIAGRAM_TYPES, OUTPUT_PURPOSES, STYLE_OPTIONS } from '../data/examples'
import TemplateManager from './TemplateManager'

function InputPanel({
  input,
  setInput,
  diagramType,
  setDiagramType,
  outputPurpose,
  setOutputPurpose,
  style,
  setStyle,
  onGenerate,
  onClear,
  onSaveTemplate,
  templates,
  onLoadTemplate,
  onDeleteTemplate
}) {
  return (
    <section className="panel input-panel">
      <div className="panel-heading">
        <h2>输入与配置</h2>
        <span>把复杂流程变成清晰图示</span>
      </div>

      <label className="field-label" htmlFor="flow-input">流程描述</label>
      <textarea
        id="flow-input"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="粘贴流程描述、PRD、会议纪要或 SOP……"
      />

      <div className="form-grid">
        <label className="field-label">
          流程图类型
          <select value={diagramType} onChange={(event) => setDiagramType(event.target.value)}>
            {DIAGRAM_TYPES.map((type) => (
              <option value={type.value} key={type.value}>{type.label}</option>
            ))}
          </select>
        </label>

        <label className="field-label">
          输出用途
          <select value={outputPurpose} onChange={(event) => setOutputPurpose(event.target.value)}>
            {OUTPUT_PURPOSES.map((purpose) => <option key={purpose}>{purpose}</option>)}
          </select>
        </label>

        <label className="field-label">
          风格
          <select value={style} onChange={(event) => setStyle(event.target.value)}>
            {STYLE_OPTIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="button-row">
        <button type="button" className="primary" onClick={onGenerate}>生成流程图</button>
        <button type="button" onClick={onClear}>清空内容</button>
        <button type="button" onClick={onSaveTemplate}>保存为模板</button>
      </div>

      <div className="template-card">
        <h3>我的模板</h3>
        <TemplateManager templates={templates} onLoadTemplate={onLoadTemplate} onDeleteTemplate={onDeleteTemplate} />
      </div>
    </section>
  )
}

export default InputPanel
