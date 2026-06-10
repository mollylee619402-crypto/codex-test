import { useRef } from 'react'
import { DIAGRAM_TYPES } from '../data/examples.js'

function formatTime(value) {
  if (!value) return '未记录'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未记录'
  return date.toLocaleString('zh-CN', { hour12: false })
}

function templateLabel(templateType) {
  return DIAGRAM_TYPES.find((type) => type.value === templateType)?.label || templateType || '未指定模板'
}

function ProjectConfigManager({
  projectConfigs = [],
  currentConfigJson = '',
  onSaveCurrent,
  onLoadConfig,
  onDeleteConfig,
  onExportCurrent,
  onExportConfig,
  onCopyCurrentJson,
  onImportConfig
}) {
  const fileInputRef = useRef(null)

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file) onImportConfig?.(file)
    event.target.value = ''
  }

  return (
    <div className="project-config-manager">
      <div className="config-card-heading">
        <h3>项目配置管理</h3>
        <span>保存 / 导入 / 导出 / 本地项目库</span>
      </div>

      <div className="button-row compact project-config-actions">
        <button type="button" className="primary" onClick={onSaveCurrent}>保存当前项目配置</button>
        <button type="button" onClick={onExportCurrent}>导出配置 JSON</button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>导入配置 JSON</button>
        <button type="button" onClick={onCopyCurrentJson}>复制配置 JSON</button>
      </div>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
      />

      <details className="project-json-preview">
        <summary>查看当前配置 JSON 预览</summary>
        <pre>{currentConfigJson}</pre>
      </details>

      <div className="saved-config-list" aria-label="已保存配置列表">
        {projectConfigs.length === 0 ? (
          <p className="empty-tip">本地项目库暂无配置。点击“保存当前项目配置”后，可在此加载、删除或单独导出。</p>
        ) : projectConfigs.map((config) => (
          <article className="saved-config-item" key={config.id}>
            <div className="saved-config-meta">
              <strong>{config.projectConfig?.projectName || '未命名项目'}</strong>
              <span>图题：{config.projectConfig?.figureTitle || '未填写'}</span>
              <span>模板：{templateLabel(config.templateType)}</span>
              <span>更新：{formatTime(config.updatedAt)}</span>
            </div>
            <div className="saved-config-buttons">
              <button type="button" onClick={() => onLoadConfig?.(config)}>加载</button>
              <button type="button" onClick={() => onExportConfig?.(config)}>导出</button>
              <button type="button" className="text-danger" onClick={() => onDeleteConfig?.(config.id)}>删除</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default ProjectConfigManager
