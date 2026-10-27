import { toPersianDigits } from '../lib/jalali'

export function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (next: number) => void
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next))

  return (
    <span className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        className="stepper-step"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label={`${label} — کمتر`}
      >
        −
      </button>
      <span className="stepper-value" aria-live="polite">
        {toPersianDigits(value)}
      </span>
      <button
        type="button"
        className="stepper-step"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label={`${label} — بیشتر`}
      >
        +
      </button>
    </span>
  )
}
