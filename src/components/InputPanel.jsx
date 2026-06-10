import { DIAGRAM_TYPES, ENVIRONMENT_EXAMPLES, OUTPUT_PURPOSES, STYLE_OPTIONS } from '../data/examples'
import { PROJECT_PRESETS } from '../utils/projectConfigDefaults.js'
import ProjectConfigPanel from './ProjectConfigPanel'
import StructuredEditor from './StructuredEditor'
import TemplatePresetSelector from './TemplatePresetSelector'
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
  onLoadEnvironmentExample,
  projectConfig,
  setProjectConfig,
  structuredInput,
  setStructuredInput,
  parserErrors,
  onApplyProjectPreset,
  templates,
  onLoadTemplate,
  onDeleteTemplate
}) {
  const handleExampleChange = (event) => {
    const example = ENVIRONMENT_EXAMPLES.find((item) => item.id === event.target.value)
    if (example) onLoadEnvironmentExample(example)
  }

  return (
    <section className="panel input-panel">
      <div className="panel-heading">
        <h2>输入与配置</h2>
        <span>把复杂流程变成清晰图示</span>
      </div>

      <div className="example-switcher">
        <label className="field-label">
          环保工程内置示例
          <select defaultValue="" onChange={handleExampleChange}>
            <option value="" disabled>选择示例并载入</option>
            {ENVIRONMENT_EXAMPLES.map((example) => <option value={example.id} key={example.id}>{example.name}</option>)}
          </select>
        </label>
        <div className="preset-block">
          <strong>示例一键套用</strong>
          <TemplatePresetSelector presets={PROJECT_PRESETS} onApply={onApplyProjectPreset} />
        </div>
      </div>

      <label className="field-label" htmlFor="flow-input">流程描述</label>
      <textarea
        id="flow-input"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="粘贴流程描述、PRD、会议纪要、SOP、环保工程技术报告流程或项目组织架构描述……"
      />

      <ProjectConfigPanel projectConfig={projectConfig} onChange={setProjectConfig} />

      <StructuredEditor value={structuredInput} onChange={setStructuredInput} parserErrors={parserErrors} />

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

      <div className="visio-tip">
        <strong>导出提示：</strong>进入 Visio 调整建议下载 SVG 后插入；若需要文字和节点尽量可编辑，建议下载 PPTX 可编辑版。
      </div>

      <div className="template-card">
        <h3>我的模板</h3>
        <TemplateManager templates={templates} onLoadTemplate={onLoadTemplate} onDeleteTemplate={onDeleteTemplate} />
      </div>
    </section>
  )
}

export default InputPanel
