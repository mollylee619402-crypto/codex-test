import { fileNameFromTitle, sanitizeFileName } from './fileName.js'
import { PROJECT_CONFIG_VERSION, createProjectConfigId, normalizeProjectName } from './projectConfigStorage.js'

export function buildProjectConfigPayload({
  templateType,
  projectConfig,
  structuredInput,
  diagramContent,
  exportSizePreset,
  pngScale,
  input,
  outputPurpose,
  style,
  id,
  createdAt
}) {
  const now = new Date().toISOString()
  const normalizedProjectConfig = {
    ...projectConfig,
    projectName: normalizeProjectName(projectConfig)
  }

  return {
    version: PROJECT_CONFIG_VERSION,
    id: id || createProjectConfigId(),
    templateType,
    projectConfig: normalizedProjectConfig,
    structuredInput: structuredInput || '',
    diagramContent: diagramContent || { templateType, stages: [] },
    exportSettings: {
      exportSizePreset: exportSizePreset || 'word-page',
      pngScale: Number(pngScale) || 3
    },
    input: input || '',
    outputPurpose: outputPurpose || normalizedProjectConfig.reportUse || '',
    style: style || '技术报告',
    createdAt: createdAt || now,
    updatedAt: now
  }
}

export function serializeProjectConfig(config) {
  return JSON.stringify(config, null, 2)
}

export function downloadProjectConfigJson(config) {
  const projectName = sanitizeFileName(config?.projectConfig?.projectName || config?.projectConfig?.figureTitle || '未命名项目')
  const blob = new Blob([serializeProjectConfig(config)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileNameFromTitle(`项目配置_${projectName}`, 'json')
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
