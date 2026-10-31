import { useCallback, useEffect, useRef, useState } from 'react'
import { DropperIcon, ICON } from './components/Icons'

interface Sample {
  hex: string
  x: number
  y: number
  cx: number
  cy: number
}

function toHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** A frozen screen, a crosshair, and the exact colour under it. */
export default function PickerView() {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sample, setSample] = useState<Sample | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    let live = true
    const start = async (): Promise<void> => {
      const frame = await window.qio.screen.frame()
      if (!live) return
      if (!frame) {
        setFailed(true)
        void window.qio.screen.ready()
        return
      }
      const image = new Image()
      image.onload = () => {
        if (!live) return
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d', { willReadFrequently: true })
        context?.drawImage(image, 0, 0)
        contextRef.current = context
        setReady(true)
        void window.qio.screen.ready()
      }
      image.onerror = () => {
        if (!live) return
        setFailed(true)
        void window.qio.screen.ready()
      }
      image.src = frame.dataUrl
    }
    void start()

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') void window.qio.screen.cancelPicker()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      live = false
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const readAt = useCallback((clientX: number, clientY: number): Sample | null => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return null
    const rect = canvas.getBoundingClientRect()
    const x = Math.min(canvas.width - 1, Math.max(0, Math.round(((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width)))
    const y = Math.min(canvas.height - 1, Math.max(0, Math.round(((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height)))
    const data = context.getImageData(x, y, 1, 1).data
    return { hex: toHex(data[0], data[1], data[2]), x, y, cx: clientX, cy: clientY }
  }, [])

  if (failed) {
    return (
      <div className="picker-fail">
        <p>گرفتن تصویر صفحه ممکن نشد. شاید ویندوز اجازهٔ ضبط نمایشگر را نداده باشد.</p>
        <button type="button" className="pill" onClick={() => void window.qio.screen.cancelPicker()}>
          بستن
        </button>
      </div>
    )
  }

  const labelLeft = sample ? (sample.cx + 150 > window.innerWidth ? sample.cx - 136 : sample.cx + 20) : 0
  const labelTop = sample ? (sample.cy + 84 > window.innerHeight ? sample.cy - 68 : sample.cy + 20) : 0

  return (
    <div
      className={`picker${ready ? ' is-ready' : ''}`}
      onPointerMove={(event) => {
        const next = readAt(event.clientX, event.clientY)
        if (next) setSample(next)
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const next = readAt(event.clientX, event.clientY)
        if (next) void window.qio.screen.pick(next.hex, next.x, next.y)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        void window.qio.screen.cancelPicker()
      }}
    >
      <canvas ref={canvasRef} className="picker-canvas" />
      {!ready && <p className="picker-loading">در حال گرفتن تصویر صفحه…</p>}
      <div className="picker-hint">
        <DropperIcon size={ICON.sm} aria-hidden="true" />
        <span>نشانه را روی رنگ ببر و کلیک کن</span>
        <span className="picker-esc">Esc برای انصراف</span>
      </div>
      {sample && (
        <>
          <span className="picker-ring" style={{ left: sample.cx, top: sample.cy }} />
          <div className="picker-label" style={{ left: labelLeft, top: labelTop }}>
            <span className="picker-chip" style={{ background: sample.hex }} />
            <span className="picker-hex" dir="ltr">
              {sample.hex}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
