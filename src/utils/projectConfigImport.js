import { DIAGRAM_TYPES, OUTPUT_PURPOSES, STYLE_OPTIONS } from '../data/examples.js'
import { DEFAULT_PROJECT_CONFIG, createDefaultStructuredText, mergeProjectConfig } from './projectConfigDefaults.js'
import { PROJECT_CONFIG_VERSION, createProjectConfigId, normalizeProjectName } from './projectConfigStorage.js'

const KNOWN_TEMPLATE_TYPES = new Set(DIAGRAM_TYPES.map((type) => type.value))

function normalizeTemplateType(templateType) {
  return KNOWN_TEMPLATE_TYPES.has(templateType) ? templateType : 'technical-service'
}

function normalizeExportSettings(settings = {}) {
  const pngScale = Number(settings.pngScale)
  return {
    exportSizePreset: settings.exportSizePreset || settings.exportSize || 'word-page',
    pngScale: Number.isFinite(pngScale) && pngScale > 0 ? pngScale : 3
  }
}

export function normalizeImportedProjectConfig(rawConfig = {}) {
  if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
    throw new Error('JSON 解析失败，请检查文件格式')
  }

  const templateType = normalizeTemplateType(rawConfig.templateType || rawConfig.diagramType)
  const projectConfig = mergeProjectConfig(DEFAULT_PROJECT_CONFIG, rawConfig.projectConfig || {})
  projectConfig.projectName = normalizeProjectName(projectConfig)
  const exportSettings = normalizeExportSettings(rawConfig.exportSettings || {})

  return {
    version: rawConfig.version || PROJECT_CONFIG_VERSION,
    id: rawConfig.id || createProjectConfigId(),
    templateType,
    projectConfig,
    structuredInput: typeof rawConfig.structuredInput === 'string' ? rawConfig.structuredInput : createDefaultStructuredText(templateType),
    diagramContent: rawConfig.diagramContent && typeof rawConfig.diagramContent === 'object'
      ? { templateType, stages: Array.isArray(rawConfig.diagramContent.stages) ? rawConfig.diagramContent.stages : [] }
      : { templateType, stages: [] },
    exportSettings,
    input: typeof rawConfig.input === 'string' ? rawConfig.input : '',
    outputPurpose: OUTPUT_PURPOSES.includes(rawConfig.outputPurpose) ? rawConfig.outputPurpose : (projectConfig.reportUse || '环保工程技术报告'),
    style: STYLE_OPTIONS.includes(rawConfig.style) ? rawConfig.style : '技术报告',
    createdAt: rawConfig.createdAt || new Date().toISOString(),
    updatedAt: rawConfig.updatedAt || new Date().toISOString()
  }
}

export function parseProjectConfigJson(text) {
  try {
    return normalizeImportedProjectConfig(JSON.parse(text))
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('JSON 解析失败，请检查文件格式')
    throw error
  }
}

export function readProjectConfigFile(file) {
  if (!window.FileReader) {
    return Promise.reject(new Error('当前浏览器不支持文件导入'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(parseProjectConfigJson(String(reader.result || '')))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('JSON 解析失败，请检查文件格式'))
    reader.readAsText(file, 'utf-8')
  })
}
