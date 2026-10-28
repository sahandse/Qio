import { useState } from 'react'
import type { ReactNode } from 'react'
import type { MascotSettings, MascotState } from '@shared/types'
import { toPersianDigits } from '../lib/jalali'
import {
  MASCOT_COLORS,
  MASCOT_PRESETS,
  MASCOT_SHAPE_LIST,
  MASCOT_STATE_LIST,
  MASCOT_STATES,
  Mascot
} from './Mascot'

const SLEEP_CHOICES = [8, 15, 30, 60]

function Chip({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" className={`mascot-chip${active ? ' on' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

function Switch({
  label,
  hint,
  checked,
  onChange
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button type="button" className="setting-row" onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span className="setting-text">
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
      <span className={`switch${checked ? ' on' : ''}`}>
        <span className="switch-knob" />
      </span>
    </button>
  )
}

function Dial({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onChange: (next: number) => void
}) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <label className="mascot-dial">
      <span className="mascot-dial-label">{label}</span>
      <input
        className="rail settings-rail"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--p' as string]: `${fill}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="mascot-dial-value">{format(value)}</span>
    </label>
  )
}

export function MascotSettingsCard({
  style,
  onPatch
}: {
  style: MascotSettings
  onPatch: (next: Partial<MascotSettings>) => void
}) {
  const [preview, setPreview] = useState<MascotState | null>(null)
  const shown = preview ?? 'idle'
  const sleepChoices = SLEEP_CHOICES.includes(style.sleepAfter)
    ? SLEEP_CHOICES
    : [...SLEEP_CHOICES, style.sleepAfter].sort((a, b) => a - b)

  return (
    <section className="settings-card settings-mascot">
      <h3>ماسکوت</h3>

      <div className="mascot-stage" onClick={() => setPreview((current) => (current ? null : 'wave'))}>
        <Mascot settings={style} state={shown} className="mascot-stage-art" />
      </div>
      <p className="mascot-caption">
        <strong>{MASCOT_STATES[shown].label}</strong>
        <span>{MASCOT_STATES[shown].sub}</span>
      </p>

      <div className="mascot-chips">
        {MASCOT_STATE_LIST.map((entry) => (
          <Chip key={entry.id} active={shown === entry.id} onClick={() => setPreview(entry.id === 'idle' ? null : entry.id)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      <div className="mascot-group">
        <span className="mascot-group-label">قالب آماده</span>
        <div className="mascot-chips">
          {MASCOT_PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              active={Object.entries(preset.patch).every(([key, value]) => style[key as keyof MascotSettings] === value)}
              onClick={() => onPatch(preset.patch)}
            >
              {preset.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mascot-group">
        <span className="mascot-group-label">شکل چشم</span>
        <div className="mascot-chips">
          {MASCOT_SHAPE_LIST.map((shape) => (
            <Chip key={shape.id} active={style.shape === shape.id} onClick={() => onPatch({ shape: shape.id })}>
              {shape.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mascot-group">
        <span className="mascot-group-label">رنگ</span>
        <div className="mascot-swatches">
          {MASCOT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`mascot-swatch${style.color === color ? ' on' : ''}`}
              style={{ ['--c' as string]: color }}
              aria-label={`رنگ ${color}`}
              onClick={() => onPatch({ color })}
            />
          ))}
          <label className="mascot-color">
            <input type="color" value={style.color} onChange={(event) => onPatch({ color: event.target.value })} />
            <span>دلخواه</span>
          </label>
        </div>
      </div>

      <div className="mascot-group">
        <Dial
          label="اندازه"
          value={style.size}
          min={14}
          max={32}
          step={1}
          format={(value) => toPersianDigits(value)}
          onChange={(size) => onPatch({ size })}
        />
        <Dial
          label="فاصله"
          value={style.gap}
          min={16}
          max={46}
          step={1}
          format={(value) => toPersianDigits(value)}
          onChange={(gap) => onPatch({ gap })}
        />
        <Dial
          label="پلک هر"
          value={style.blink}
          min={2}
          max={9}
          step={0.5}
          format={(value) => `${toPersianDigits(String(value)).replace('.', '٫')} ثانیه`}
          onChange={(blink) => onPatch({ blink })}
        />
      </div>

      <div className="mascot-group mascot-toggles">
        <Switch label="درخشش چشم" checked={style.glow} onChange={(glow) => onPatch({ glow })} />
        <Switch label="مردمک" checked={style.pupil} onChange={(pupil) => onPatch({ pupil })} />
        <Switch label="ابرو" checked={style.brows} onChange={(brows) => onPatch({ brows })} />
        <Switch label="گونهٔ گلگون" checked={style.blush} onChange={(blush) => onPatch({ blush })} />
        <Switch label="دست هنگام سلام" checked={style.hand} onChange={(hand) => onPatch({ hand })} />
        <Switch label="zzz در خواب" checked={style.zzz} onChange={(zzz) => onPatch({ zzz })} />
      </div>

      <div className="setting-row">
        <span className="setting-text">
          <strong>خواب بعد از</strong>
          <small>چند ثانیه بی‌حرکتی، چشم‌ها را می‌بندد</small>
        </span>
        <span className="setting-control">
          <select
            className="setting-select"
            value={style.sleepAfter}
            onChange={(event) => onPatch({ sleepAfter: Number(event.target.value) })}
          >
            {sleepChoices.map((seconds) => (
              <option key={seconds} value={seconds}>
                {toPersianDigits(seconds)} ثانیه
              </option>
            ))}
          </select>
        </span>
      </div>

      <Switch
        label="کاهش حرکت"
        hint="انیمیشن چشم‌ها و پلک‌زدن متوقف می‌شود"
        checked={style.reducedMotion}
        onChange={(reducedMotion) => onPatch({ reducedMotion })}
      />
    </section>
  )
}
