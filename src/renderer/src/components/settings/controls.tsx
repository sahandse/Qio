import type { ReactNode } from 'react'
import { toPersianDigits } from '../../lib/jalali'
import { Stepper } from '../Stepper'

export function Toggle({
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

export function NumberRow({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (next: number) => void
}) {
  return (
    <div className="setting-row">
      <span className="setting-text">
        <strong>{label}</strong>
      </span>
      <span className="setting-control">
        <Stepper label={label} value={value} min={min} max={max} step={step} onChange={onChange} />
        {suffix && <span className="setting-suffix">{suffix}</span>}
      </span>
    </div>
  )
}

export function HourRow({
  label,
  value,
  onChange
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  return (
    <label className="setting-row">
      <span className="setting-text">
        <strong>{label}</strong>
      </span>
      <select className="setting-select" value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {Array.from({ length: 25 }, (_, hour) => (
          <option key={hour} value={hour}>
            {toPersianDigits(`${hour}`.padStart(2, '0'))}:۰۰
          </option>
        ))}
      </select>
    </label>
  )
}

export function SliderRow({
  label,
  hint,
  icon,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix,
  disabled,
  onChange
}: {
  label: string
  hint?: string
  icon?: ReactNode
  value: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  disabled?: boolean
  onChange: (next: number) => void
}) {
  const range = max - min
  const fill = range > 0 ? ((value - min) / range) * 100 : 0
  return (
    <label className="setting-row">
      <span className="setting-text">
        <strong>
          {icon} {label}
        </strong>
        {hint && <small>{hint}</small>}
      </span>
      <span className="setting-control">
        <input
          className="rail settings-rail"
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.round(value)}
          disabled={disabled}
          style={{ ['--p' as string]: `${fill}%` }}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="setting-suffix">{suffix ?? `${toPersianDigits(Math.round(value))}٪`}</span>
      </span>
    </label>
  )
}
