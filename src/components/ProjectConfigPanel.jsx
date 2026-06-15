const CORE_FIELDS = [
  ['projectName', '项目名称', '某化工企业污染场地调查与风险评估项目'],
  ['figureNumber', '图号', '图4-1'],
  ['figureTitle', '图题', '本项目技术服务工作流程'],
  ['projectType', '项目类型', '污染场地调查 / 废水处理 / 环保验收'],
  ['reportUse', '输出用途', '技术服务方案 / 场地调查报告 / 风险评估报告']
]

const MORE_FIELDS = [
  ['serviceTarget', '建设单位或服务对象', '某建设单位'],
  ['organizationName', '编制单位', '某环保科技有限公司'],
  ['exportBaseName', '导出文件名', '留空则自动使用项目简称和图题']
]

function ProjectConfigPanel({ projectConfig, onChange, currentConfigJson = '' }) {
  const updateField = (key, value) => onChange({ ...projectConfig, [key]: value })

  return (
    <section className="config-card project-config-compact">
      <div className="project-config-grid core-project-fields">
        {CORE_FIELDS.map(([key, label, placeholder]) => (
          <label className="field-label" key={key}>
            {label}
            <input value={projectConfig[key] || ''} onChange={(event) => updateField(key, event.target.value)} placeholder={placeholder} />
          </label>
        ))}
      </div>
      <details className="more-project-settings">
        <summary>更多项目设置</summary>
        <div className="project-config-grid">
          {MORE_FIELDS.map(([key, label, placeholder]) => (
            <label className="field-label" key={key}>
              {label}
              <input value={projectConfig[key] || ''} onChange={(event) => updateField(key, event.target.value)} placeholder={placeholder} />
            </label>
          ))}
          <label className="field-label project-json-preview">
            项目配置 JSON
            <textarea className="structured-editor ocr-raw-text" value={currentConfigJson} readOnly />
          </label>
        </div>
      </details>
    </section>
  )
}

export default ProjectConfigPanel
