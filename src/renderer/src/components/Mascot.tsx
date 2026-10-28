import type { CSSProperties } from 'react'
import type { MascotSettings, MascotShape, MascotState } from '@shared/types'

/** Width and corner ratio of each eye for a given height, in the artwork's units. */
const SHAPES: Record<MascotShape, { width: number; radius: number; label: string }> = {
  oval: { width: 0.72, radius: 0.5, label: 'بیضی' },
  round: { width: 1, radius: 0.5, label: 'گرد' },
  soft: { width: 0.92, radius: 0.28, label: 'نرم' },
  tall: { width: 0.52, radius: 0.5, label: 'باریک' }
}

export const MASCOT_SHAPE_LIST = (Object.keys(SHAPES) as MascotShape[]).map((id) => ({ id, ...SHAPES[id] }))

export const MASCOT_COLORS = ['#eef3f8', '#5eead4', '#ff8ab8', '#facc15', '#60a5fa', '#a3e635']

export const MASCOT_PRESETS: { id: string; label: string; patch: Partial<MascotSettings> }[] = [
  { id: 'classic', label: 'کلاسیک', patch: { shape: 'oval', color: '#eef3f8', size: 22, gap: 30, glow: true, pupil: false, brows: false, blush: false } },
  { id: 'fun', label: 'بامزه', patch: { shape: 'round', color: '#5eead4', size: 26, gap: 34, glow: true, pupil: false, brows: false, blush: true } },
  { id: 'cyber', label: 'سایبر', patch: { shape: 'soft', color: '#a3e635', size: 20, gap: 32, glow: false, pupil: false, brows: false, blush: false, blink: 3.5 } },
  { id: 'soft', label: 'ملایم', patch: { shape: 'oval', color: '#ff8ab8', size: 24, gap: 30, glow: true, pupil: true, brows: true, blush: true } }
]

export const MASCOT_STATES: Record<MascotState, { label: string; sub: string }> = {
  idle: { label: 'آماده', sub: 'منتظر دستور تو هستم' },
  sleep: { label: 'خواب', sub: 'زززز…' },
  wave: { label: 'سلام', sub: 'سلام! خوش برگشتی' },
  think: { label: 'فکر', sub: 'یه لحظه صبر کن…' },
  work: { label: 'کار', sub: 'دارم تمرکز می‌کنم' },
  success: { label: 'موفق', sub: 'تمام شد!' },
  error: { label: 'خطا', sub: 'یه جای کار می‌لنگه' },
  perm: { label: 'دسترسی', sub: 'اجازه می‌دی؟' }
}

export const MASCOT_STATE_LIST = (Object.keys(MASCOT_STATES) as MascotState[]).map((id) => ({ id, ...MASCOT_STATES[id] }))

/** Very light colours need a dark glint; saturated ones read better with white. */
function isPale(hex: string): boolean {
  const value = hex.replace('#', '')
  if (value.length !== 6) return true
  const channels = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16))
  return (Math.max(...channels) + Math.min(...channels)) / 510 > 0.88
}

export function Mascot({
  settings,
  state = 'idle',
  className,
  viewBox = '0 0 100 44'
}: {
  settings: MascotSettings
  state?: MascotState
  className?: string
  viewBox?: string
}) {
  const height = settings.size
  const shape = SHAPES[settings.shape]
  const width = height * shape.width
  const radius = width * shape.radius
  const centerY = 22
  const stroke = Math.max(2.2, height * 0.13)
  const left = 50 - settings.gap / 2
  const right = 50 + settings.gap / 2
  const leftEdge = left - width / 2
  const rightEdge = right + width / 2
  const decoX = Math.min(88, rightEdge + 4)
  const handX = Math.min(85, rightEdge + 8)
  const codeY = centerY + 2.4
  const highlight = isPale(settings.color) ? '#94a3b8' : '#ffffff'

  const style = {
    ['--ms-color' as string]: settings.color,
    ['--ms-stroke' as string]: stroke,
    ['--ms-blink' as string]: `${settings.blink}s`
  } as CSSProperties

  const eyes = [left, right].map((cx, index) => {
    const x = cx - width / 2
    const y = centerY - height / 2
    return (
      <g key={index} className="ms-eye" style={{ transformOrigin: `${cx}px ${centerY}px` }}>
        <rect
          className="ms-open"
          x={x}
          y={y}
          width={width}
          height={height}
          rx={radius}
          fill={settings.color}
        />
        {settings.pupil && (
          <ellipse
            className="ms-pupil"
            cx={cx}
            cy={centerY}
            rx={width * 0.24}
            ry={height * 0.24}
            fill="#0b0e14"
          />
        )}
        {settings.glow && (
          <circle
            className="ms-glint"
            cx={cx + width * 0.2}
            cy={centerY - height * 0.2}
            r={height * 0.1}
            fill={highlight}
          />
        )}
        <path className="ms-closed" d={`M${x} ${centerY}Q${cx} ${centerY + height * 0.38} ${cx + width / 2} ${centerY}`} />
        <path
          className="ms-happy"
          d={`M${x} ${centerY + height * 0.18}Q${cx} ${centerY - height * 0.42} ${cx + width / 2} ${centerY + height * 0.18}`}
        />
        <path
          className="ms-cross"
          d={`M${cx - width * 0.35} ${centerY - height * 0.3}l${width * 0.7} ${height * 0.6}m0 ${-height * 0.6}l${-width * 0.7} ${height * 0.6}`}
        />
      </g>
    )
  })

  const brows = settings.brows
    ? [left, right].map((cx, index) => {
        const x = cx - width / 2
        return (
          <path
            key={index}
            className={`ms-brow${index === 0 ? ' ms-brow-start' : ''}`}
            d={`M${x} ${centerY - height / 2 - 4}q${width / 2} -3 ${width} 0`}
          />
        )
      })
    : null

  const blush = settings.blush
    ? [left, right].map((cx, index) => (
        <ellipse
          key={index}
          className="ms-blush"
          cx={cx}
          cy={centerY + height / 2 + 4}
          rx={width * 0.4}
          ry={2.4}
          fill="#ff7a90"
        />
      ))
    : null

  return (
    <svg
      className={`ms${settings.reducedMotion ? ' ms-still' : ''}${className ? ` ${className}` : ''}`}
      viewBox={viewBox}
      data-state={state}
      style={style}
      aria-hidden="true"
    >
      <g className="ms-breathe">
        <g className="ms-eyes">
          {eyes}
          {brows}
          {blush}
        </g>

        {settings.zzz && (
          <g className="ms-fx ms-zzz" fill={settings.color} fontWeight="800">
            <text x={decoX} y={14} fontSize={9}>
              z
            </text>
            <text x={decoX + 7} y={6} fontSize={6}>
              z
            </text>
          </g>
        )}

        <g className="ms-fx ms-question" fill={settings.color}>
          <text x={decoX + 3} y={11} fontSize={14} fontWeight="800">
            ?
          </text>
        </g>

        <g className="ms-fx ms-thought" fill={settings.color}>
          <circle cx={decoX} cy={12} r={1.6} />
          <circle cx={decoX + 5} cy={8} r={2} />
          <circle cx={decoX + 10} cy={4} r={2.4} />
        </g>

        <path
          className="ms-fx ms-sparkle"
          fill="#facc15"
          d="M6 8l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5zM90 30l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"
        />

        {settings.hand && (
          <g className="ms-fx ms-hand" style={{ transformOrigin: `${handX + 3.5}px 25px` }}>
            <rect x={handX} y={12} width={7} height={10} rx={3.4} fill="#f7d3b0" />
            <rect x={handX + 1.2} y={19} width={4.6} height={5} rx={2.3} fill="#f7d3b0" />
            <circle cx={handX - 1.2} cy={18} r={2} fill="#f7d3b0" />
          </g>
        )}

        <g className="ms-fx ms-code" fill={settings.color} fontFamily="monospace" fontWeight="700" fontSize={6.5}>
          <text x={leftEdge / 2} y={codeY} textAnchor="middle">
            &lt;/&gt;
          </text>
          <text x={(100 + rightEdge) / 2} y={codeY} textAnchor="middle">
            {'{ }'}
          </text>
        </g>
      </g>
    </svg>
  )
}
