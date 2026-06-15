import { useState } from 'react'
import { DIAGRAM_TYPES, OUTPUT_PURPOSES } from '../data/examples'
import { createDefaultStructuredText } from '../utils/projectConfigDefaults.js'
import ProjectConfigPanel from './ProjectConfigPanel'
import StructuredEditor from './StructuredEditor'
import ProjectConfigManager from './ProjectConfigManager'
import ImageImportPanel from './ImageImportPanel'

const CORE_TEMPLATE_TYPES = [
  { label: '资料收集与踏勘流程图', value: 'site-survey' },
  { label: '技术服务总体流程图', value: 'technical-service' },
  { label: '项目组织架构图', value: 'project-org' },
  { label: '项目整治技术路线图', value: 'remediation-route' },
  { label: '普通流程图', value: 'basic' },
  { label: '空白新建', value: 'blank' }
]

function InputPanel({
  input, setInput, diagramType, setDiagramType, outputPurpose, setOutputPurpose,
  projectConfig, setProjectConfig, structuredInput, setStructuredInput, parserErrors,
  currentConfigJson, onSaveProjectConfig, onLoadProjectConfig, onDeleteProjectConfig,
  onExportCurrentProjectConfig, onExportProjectConfig, onCopyProjectConfigJson, onImportProjectConfig,
  projectConfigs, onApplyImageImport, onDetectedOcrCaption, onDetectedVisionTemplate, onVisionResult,
  onOrganizeText, onApplyStructuredInput
}) {
  const [activeTab, setActiveTab] = useState('text')

  const handleTemplateChange = (event) => {
    const value = event.target.value
    if (value === 'blank') {
      setDiagramType('basic')
      setStructuredInput('')
      setInput('')
      return
    }
    setDiagramType(value)
    setStructuredInput(createDefaultStructuredText(value))
  }

  return (
    <section className="panel input-panel simple-flow-panel">
      <section className="flow-step-card">
        <div className="step-heading"><span>1</span><h2>第 1 步：选择项目类型</h2></div>
        <label className="field-label">图件模板
          <select value={CORE_TEMPLATE_TYPES.some((type) => type.value === diagramType) ? diagramType : 'basic'} onChange={handleTemplateChange}>
            {CORE_TEMPLATE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <ProjectConfigPanel projectConfig={{ ...projectConfig, reportUse: outputPurpose }} onChange={(next) => { setProjectConfig(next); if (next.reportUse) setOutputPurpose(next.reportUse) }} currentConfigJson={currentConfigJson} />
      </section>

      <section className="flow-step-card">
        <div className="step-heading"><span>2</span><h2>第 2 步：输入内容或上传截图</h2></div>
        <div className="simple-tabs" role="tablist">
          <button type="button" className={activeTab === 'text' ? 'is-active' : ''} onClick={() => setActiveTab('text')}>文字输入</button>
          <button type="button" className={activeTab === 'image' ? 'is-active' : ''} onClick={() => setActiveTab('image')}>图片识别</button>
        </div>
        {activeTab === 'text' ? (
          <div className="simple-tab-panel">
            <textarea
              id="flow-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="粘贴流程说明、节点列表、报告段落或已有结构化内容，系统会整理为阶段、节点和子节点。"
            />
            <div className="button-row">
              <button type="button" className="primary" onClick={onOrganizeText}>整理为结构化内容</button>
              <button type="button" onClick={() => setInput('')}>清空输入</button>
            </div>
          </div>
        ) : (
          <ImageImportPanel onApply={onApplyImageImport} onDetectedCaption={onDetectedOcrCaption} diagramType={diagramType} projectConfig={projectConfig} onTemplateTypeDetected={onDetectedVisionTemplate} onVisionResult={onVisionResult} />
        )}
      </section>

      <section className="flow-step-card">
        <div className="step-heading"><span>3</span><h2>第 3 步：编辑结构化内容</h2></div>
        <StructuredEditor value={structuredInput} onChange={setStructuredInput} parserErrors={parserErrors} />
        <div className="button-row">
          <button type="button" onClick={() => setStructuredInput(createDefaultStructuredText(diagramType))}>套用当前模板默认内容</button>
          <button type="button" onClick={() => onOrganizeText(structuredInput)}>格式化结构化内容</button>
          <button type="button" onClick={() => setStructuredInput('')}>清空内容</button>
          <button type="button" className="primary" onClick={onApplyStructuredInput}>应用到当前流程</button>
        </div>
        <details className="advanced-edit-panel"><summary>高级编辑</summary><p className="empty-tip">复杂节点树、草稿区和手动层级调整已默认隐藏。可继续直接编辑上方结构化文本。</p></details>
      </section>

      <section className="flow-step-card project-config-details">
        <details>
          <summary>保存 / 加载项目配置</summary>
          <ProjectConfigManager projectConfigs={projectConfigs} currentConfigJson={currentConfigJson} onSaveCurrent={onSaveProjectConfig} onLoadConfig={onLoadProjectConfig} onDeleteConfig={onDeleteProjectConfig} onExportCurrent={onExportCurrentProjectConfig} onExportConfig={onExportProjectConfig} onCopyCurrentJson={onCopyProjectConfigJson} onImportConfig={onImportProjectConfig} />
        </details>
      </section>
    </section>
  )
}

export default InputPanel
