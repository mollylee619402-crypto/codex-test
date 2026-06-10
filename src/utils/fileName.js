const RESERVED = /[\\/:*?"<>|#%{}^~\[\]`]/g

export function sanitizeFileName(name, fallback = 'flowcraft-diagram') {
  const cleaned = String(name || fallback)
    .replace(/^图\d+[\-－]\d+\s*/, '')
    .replace(RESERVED, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, '')
    .trim()

  return cleaned || fallback
}

export function dateStamp(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function flowCraftBaseName(title, date = new Date()) {
  return `FlowCraft_${sanitizeFileName(title)}_${dateStamp(date)}`
}

export function fileNameFromTitle(title, extension, options = {}) {
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  const baseName = options.flowCraft === false ? sanitizeFileName(title) : flowCraftBaseName(title, options.date)
  return `${baseName}${ext}`
}
