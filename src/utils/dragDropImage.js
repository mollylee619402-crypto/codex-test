import { isSupportedImageFile } from './imageOcr.js'

export function getFirstSupportedDraggedImage(dataTransfer) {
  const files = Array.from(dataTransfer?.files || [])
  const firstImage = files.find((file) => file.type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name || ''))
  if (!firstImage) {
    return { file: null, multiple: files.length > 1, unsupported: files.length > 0 }
  }

  return {
    file: isSupportedImageFile(firstImage) ? firstImage : null,
    multiple: files.length > 1,
    unsupported: !isSupportedImageFile(firstImage)
  }
}
