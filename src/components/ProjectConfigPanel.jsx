const FIELD_DEFINITIONS = [
  ['projectName', '项目名称', '某化工企业污染场地调查与风险评估项目'],
  ['figureNumber', '图号', '图4-1'],
  ['figureTitle', '图题', '本项目技术服务工作流程'],
  ['reportUse', '报告用途', '技术服务方案 / 场地调查报告 / 风险评估报告'],
  ['projectType', '项目类型', '污染场地调查 / 废水处理 / 环保验收'],
  ['serviceTarget', '建设单位或服务对象', '某建设单位'],
  ['organizationName', '编制单位', '某环保科技有限公司'],
  ['exportBaseName', '导出文件名', '留空则自动使用项目简称和图题']
]

function ProjectConfigPanel({ projectConfig, onChange }) {
  const updateField = (key, value) => onChange({ ...projectConfig, [key]: value })

  return (
    <section className="config-card">
      <div className="config-card-heading">
        <h3>项目参数设置</h3>
        <span>用于同步报告版 SVG、PNG、PPTX、图题说明和文件名</span>
      </div>
      <div className="project-config-grid">
        {FIELD_DEFINITIONS.map(([key, label, placeholder]) => (
          <label className="field-label" key={key}>
            {label}
            <input
              value={projectConfig[key] || ''}
              onChange={(event) => updateField(key, event.target.value)}
              placeholder={placeholder}
            />
          </label>
        ))}
      </div>
    </section>
  )
}

export default ProjectConfigPanel
