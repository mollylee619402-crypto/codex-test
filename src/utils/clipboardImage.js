const CLIPBOARD_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function clipboardSupportsFiles(event) {
  return Boolean(event?.clipboardData?.items)
}

export function getImageFileFromClipboard(event) {
  const items = Array.from(event?.clipboardData?.items || [])
  const imageItem = items.find((item) => CLIPBOARD_IMAGE_TYPES.has(item.type) || item.type?.startsWith('image/'))
  if (!imageItem || typeof imageItem.getAsFile !== 'function') return null

  const blob = imageItem.getAsFile()
  if (!blob) return null

  const extension = imageItem.type === 'image/jpeg' ? 'jpg' : (imageItem.type?.split('/')[1] || 'png')
  return new File([blob], `clipboard-flowchart-${Date.now()}.${extension}`, {
    type: blob.type || imageItem.type || 'image/png',
    lastModified: Date.now()
  })
}

export function isEditablePasteTarget(target) {
  if (!target || typeof target.closest !== 'function') return false
  return Boolean(target.closest('textarea,input,[contenteditable="true"],[contenteditable=""]'))
}
