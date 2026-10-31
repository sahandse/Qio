import { useCallback, useEffect, useRef, useState } from 'react'
import { CloseIcon, ResetIcon, TrashIcon } from './components/Icons'

interface Point {
  x: number
  y: number
}

interface Stroke {
  color: string
  width: number
  points: Point[]
}

const COLORS = ['#8ef0c8', '#ffffff', '#ffd166', '#ff6b6b', '#7cc4ff']
const WIDTHS = [
  { value: 3, label: 'نازک' },
  { value: 6, label: 'متوسط' },
  { value: 12, label: 'پهن' }
]

/** Transparent sheet over the desktop, good for circling the thing you are talking about. */
export default function DrawView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const activeRef = useRef<Stroke | null>(null)
  const [color, setColor] = useState(COLORS[0])
  const [width, setWidth] = useState(WIDTHS[1].value)
  const [depth, setDepth] = useState(0)

  const paintDot = (stroke: Stroke): void => {
    const context = contextRef.current
    const point = stroke.points[0]
    if (!context || !point) return
    context.fillStyle = stroke.color
    context.beginPath()
    context.arc(point.x, point.y, stroke.width / 2, 0, Math.PI * 2)
    context.fill()
  }

  const redraw = useCallback((): void => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return
    const dpr = window.devicePixelRatio || 1
    context.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 1) {
        paintDot(stroke)
        continue
      }
      context.strokeStyle = stroke.color
      context.lineWidth = stroke.width
      context.beginPath()
      const [first, ...rest] = stroke.points
      context.moveTo(first.x, first.y)
      for (const point of rest) context.lineTo(point.x, point.y)
      context.stroke()
    }
  }, [])

  const undo = useCallback((): void => {
    strokesRef.current.pop()
    setDepth(strokesRef.current.length)
    redraw()
  }, [redraw])

  const clear = (): void => {
    strokesRef.current = []
    activeRef.current = null
    setDepth(0)
    redraw()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(dpr, dpr)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    contextRef.current = context

    const close = (): void => void window.qio.screen.closeDraw()
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      }
    }
    const onBlur = (): void => close()
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onBlur)
    }
  }, [undo])

  const begin = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Synthetic pointers have no capture target; drawing still works without it.
    }
    const stroke: Stroke = { color, width, points: [{ x: event.clientX, y: event.clientY }] }
    strokesRef.current.push(stroke)
    activeRef.current = stroke
    paintDot(stroke)
    setDepth(strokesRef.current.length)
  }

  const extend = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const stroke = activeRef.current
    if (!stroke) return
    const last = stroke.points[stroke.points.length - 1]
    const point = { x: event.clientX, y: event.clientY }
    if (Math.hypot(point.x - last.x, point.y - last.y) < 2) return
    stroke.points.push(point)
    const context = contextRef.current
    if (!context) return
    context.strokeStyle = stroke.color
    context.lineWidth = stroke.width
    context.beginPath()
    context.moveTo(last.x, last.y)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const finish = (): void => {
    activeRef.current = null
  }

  return (
    <div className="draw">
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        onPointerDown={begin}
        onPointerMove={extend}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <div className="draw-bar">
        <div className="draw-colors" role="group" aria-label="رنگ قلم">
          {COLORS.map((entry) => (
            <button
              key={entry}
              type="button"
              className={`draw-color${entry === color ? ' on' : ''}`}
              style={{ background: entry }}
              aria-label={`رنگ ${entry}`}
              aria-pressed={entry === color}
              onClick={() => setColor(entry)}
            />
          ))}
        </div>
        <span className="draw-sep" aria-hidden="true" />
        <div className="draw-widths" role="group" aria-label="ضخامت قلم">
          {WIDTHS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className={`draw-width${entry.value === width ? ' on' : ''}`}
              aria-pressed={entry.value === width}
              onClick={() => setWidth(entry.value)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <span className="draw-sep" aria-hidden="true" />
        <button type="button" className="draw-action" aria-label="واپس" disabled={depth === 0} onClick={undo}>
          <ResetIcon size={14} />
        </button>
        <button type="button" className="draw-action" aria-label="پاک کردن" disabled={depth === 0} onClick={clear}>
          <TrashIcon size={14} />
        </button>
        <button
          type="button"
          className="draw-action draw-close"
          aria-label="بستن"
          onClick={() => void window.qio.screen.closeDraw()}
        >
          <CloseIcon size={14} />
        </button>
      </div>
      <p className="draw-hint">با ماوس بکش · Esc برای بستن</p>
    </div>
  )
}
