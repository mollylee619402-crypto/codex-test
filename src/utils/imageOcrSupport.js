const SUPPORTED_IMAGE_TYPES = new Map([
  ['image/png', 'PNG'],
  ['image/jpeg', 'JPG/JPEG'],
  ['image/webp', 'WebP']
])

export function isSupportedImageFile(file) {
  if (!file) return false
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return true
  return /\.(png|jpe?g|webp)$/i.test(file.name || '')
}

export function getSupportedImageHint() {
  return '请上传 PNG、JPG、JPEG 或 WebP 格式的流程图图片。'
}
