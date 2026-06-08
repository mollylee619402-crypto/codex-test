const RESERVED = /[\\/:*?"<>|#%{}^~\[\]`]/g

export function sanitizeFileName(name, fallback = 'flowcraft-diagram') {
  const cleaned = String(name || fallback)
    .replace(/^图\d+[\-－]\d+\s*/, '')
    .replace(RESERVED, '')
    .replace(/\s+/g, '')
    .trim()

  return cleaned || fallback
}

export function fileNameFromTitle(title, extension) {
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  return `${sanitizeFileName(title)}${ext}`
}
