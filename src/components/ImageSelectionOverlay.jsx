import { useEffect, useRef, useState } from 'react'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function toNaturalRect(rect, display, naturalSize) {
  const scaleX = naturalSize.width / Math.max(1, display.width)
  const scaleY = naturalSize.height / Math.max(1, display.height)
  return {
    x: Math.round(rect.x * scaleX),
    y: Math.round(rect.y * scaleY),
    width: Math.round(rect.width * scaleX),
    height: Math.round(rect.height * scaleY)
  }
}

function displayRectFromNatural(rect, display, naturalSize) {
  if (!rect || !naturalSize.width || !naturalSize.height) return null
  const scaleX = display.width / naturalSize.width
  const scaleY = display.height / naturalSize.height
  return { x: rect.x * scaleX, y: rect.y * scaleY, width: rect.width * scaleX, height: rect.height * scaleY }
}

function ImageSelectionOverlay({ imgRef, enabled, selection, onSelectionChange, boxes = [], naturalSize = { width: 0, height: 0 } }) {
  const layerRef = useRef(null)
  const [display, setDisplay] = useState({ width: 0, height: 0 })
  const [draft, setDraft] = useState(null)
  const startRef = useRef(null)

  useEffect(() => {
    const update = () => {
      const image = imgRef?.current
      if (!image) return
      const rect = image.getBoundingClientRect()
      setDisplay({ width: rect.width, height: rect.height })
    }
    update()
    window.addEventListener('resize', update)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    if (observer && imgRef?.current) observer.observe(imgRef.current)
    return () => {
      window.removeEventListener('resize', update)
      observer?.disconnect()
    }
  }, [imgRef, naturalSize.width, naturalSize.height])

  const pointerToLocal = (event) => {
    const rect = layerRef.current.getBoundingClientRect()
    return { x: clamp(event.clientX - rect.left, 0, rect.width), y: clamp(event.clientY - rect.top, 0, rect.height) }
  }

  const handlePointerDown = (event) => {
    if (!enabled) return
    event.preventDefault()
    event.stopPropagation()
    const point = pointerToLocal(event)
    startRef.current = point
    setDraft({ x: point.x, y: point.y, width: 0, height: 0 })
    layerRef.current?.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!enabled || !startRef.current) return
    event.preventDefault()
    event.stopPropagation()
    const point = pointerToLocal(event)
    const start = startRef.current
    setDraft({ x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width: Math.abs(point.x - start.x), height: Math.abs(point.y - start.y) })
  }

  const handlePointerUp = (event) => {
    if (!enabled || !startRef.current) return
    event.preventDefault()
    event.stopPropagation()
    const point = pointerToLocal(event)
    const start = startRef.current
    const finalDraft = { x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width: Math.abs(point.x - start.x), height: Math.abs(point.y - start.y) }
    startRef.current = null
    setDraft(null)
    layerRef.current?.releasePointerCapture?.(event.pointerId)
    if (finalDraft.width >= 8 && finalDraft.height >= 8) {
      onSelectionChange?.(toNaturalRect(finalDraft, display, naturalSize))
    }
  }

  const selectedDisplay = draft || displayRectFromNatural(selection, display, naturalSize)

  return (
    <div
      ref={layerRef}
      className={`image-selection-overlay ${enabled ? 'is-enabled' : ''}`}
      style={{ width: display.width, height: display.height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(event) => enabled && event.stopPropagation()}
      aria-hidden={!enabled}
    >
      {boxes.map((box, index) => {
        const rect = displayRectFromNatural(box, display, naturalSize)
        if (!rect) return null
        return <div key={`${box.x}-${box.y}-${index}`} className={`detected-flow-box ${box.type || 'node'}`} style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}><span>{index + 1}</span></div>
      })}
      {selectedDisplay && <div className="manual-selection-rect" style={{ left: selectedDisplay.x, top: selectedDisplay.y, width: selectedDisplay.width, height: selectedDisplay.height }} />}
    </div>
  )
}

export default ImageSelectionOverlay
