export const PROJECT_CONFIG_STORAGE_KEY = 'flowcraft_project_configs'
export const PROJECT_CONFIG_VERSION = '1.0'

export function createProjectConfigId() {
  return crypto.randomUUID?.() || `flowcraft_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function normalizeProjectName(projectConfig = {}, date = new Date()) {
  const name = String(projectConfig.projectName || '').trim()
  const title = String(projectConfig.figureTitle || '').trim()
  if (name) return name
  if (title) return title
  return `未命名项目 ${date.toLocaleString('zh-CN', { hour12: false })}`
}

export function readProjectConfigs() {
  try {
    const raw = localStorage.getItem(PROJECT_CONFIG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    throw new Error('本地存储失败，请检查浏览器权限或空间')
  }
}

export function writeProjectConfigs(configs) {
  try {
    localStorage.setItem(PROJECT_CONFIG_STORAGE_KEY, JSON.stringify(configs))
  } catch (error) {
    throw new Error('本地存储失败，请检查浏览器权限或空间')
  }
}

function isSameProjectConfig(left = {}, right = {}) {
  const leftProject = left.projectConfig || {}
  const rightProject = right.projectConfig || {}
  return String(leftProject.projectName || '').trim() === String(rightProject.projectName || '').trim() &&
    String(leftProject.figureTitle || '').trim() === String(rightProject.figureTitle || '').trim() &&
    String(left.templateType || '').trim() === String(right.templateType || '').trim()
}

export function saveProjectConfigToLibrary(config) {
  const now = new Date().toISOString()
  const projectConfig = {
    ...(config.projectConfig || {}),
    projectName: normalizeProjectName(config.projectConfig)
  }
  const nextConfig = {
    ...config,
    version: config.version || PROJECT_CONFIG_VERSION,
    id: config.id || createProjectConfigId(),
    projectConfig,
    createdAt: config.createdAt || now,
    updatedAt: now
  }

  const configs = readProjectConfigs()
  const existingIndex = configs.findIndex((item) => isSameProjectConfig(item, nextConfig))
  const nextConfigs = [...configs]
  let mode = 'created'

  if (existingIndex >= 0) {
    nextConfigs[existingIndex] = {
      ...nextConfig,
      id: configs[existingIndex].id || nextConfig.id,
      createdAt: configs[existingIndex].createdAt || nextConfig.createdAt
    }
    mode = 'updated'
  } else {
    nextConfigs.unshift(nextConfig)
  }

  writeProjectConfigs(nextConfigs)
  return { configs: nextConfigs, config: mode === 'updated' ? nextConfigs[existingIndex] : nextConfig, mode }
}

export function deleteProjectConfigFromLibrary(id) {
  const configs = readProjectConfigs()
  const nextConfigs = configs.filter((config) => config.id !== id)
  writeProjectConfigs(nextConfigs)
  return nextConfigs
}
